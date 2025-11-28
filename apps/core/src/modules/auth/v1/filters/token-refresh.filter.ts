import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthConstants } from '../config/auth.constants';

@Catch(UnauthorizedException)
export class TokenRefreshFilter implements ExceptionFilter {
    private readonly logger = new Logger(TokenRefreshFilter.name);

    constructor(
        private readonly tokenService: TokenService,
        private readonly userRepository: UserRepository,
    ) { }

    async catch(exception: UnauthorizedException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const message = exception.message;

        // Check if error is due to expired JWT or missing token (cookie expired)
        if (
            message.includes('jwt expired') ||
            message.includes('Token expirado') ||
            message.includes('No auth token') ||
            message === 'Unauthorized'
        ) {
            this.logger.debug(`Auth error caught by filter: "${message}", attempting auto-refresh...`);
            try {
                await this.handleTokenRefresh(request, response);
                return;
            } catch (error) {
                this.logger.error('Token refresh failed in filter', error);
                // Fall through to default error response
            }
        }

        // Default 401 response
        response.status(401).json({
            statusCode: 401,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message || 'Unauthorized',
        });
    }

    private async handleTokenRefresh(request: Request, response: Response) {
        // Extract refresh token from cookie
        const refreshToken = request.cookies?.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token found');
        }

        // Validate refresh token
        const userId = await this.tokenService.validateRefreshToken(refreshToken);

        if (!userId) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Get user
        const user = await this.userRepository.findPublicInfo(userId);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Generate NEW access token
        const newAccessToken = this.tokenService.generateAccessToken(user);

        // Set new cookie
        const env = process.env.NODE_ENV || 'development';
        response.cookie(AuthConstants.COOKIES.ACCESS_TOKEN_NAME, newAccessToken, {
            httpOnly: AuthConstants.COOKIES.OPTIONS.httpOnly,
            secure: AuthConstants.COOKIES.OPTIONS.secure(env),
            sameSite: AuthConstants.COOKIES.OPTIONS.sameSite(env),
            maxAge: AuthConstants.TOKENS.ACCESS_TOKEN_EXPIRES,
            path: AuthConstants.COOKIES.OPTIONS.path,
        });

        this.logger.log(`Access token refreshed successfully for user: ${user.username}`);

        // Return success response to trigger frontend retry
        response.status(401).json({
            statusCode: 401,
            message: 'Token refresh succeeded, retry request',
        });
    }
}
