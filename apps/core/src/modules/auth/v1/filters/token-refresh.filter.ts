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

/**
 * Header that signals to the frontend that the access cookie was just refreshed
 * and the original request should be retried. Body message is kept for back-compat
 * with older front builds; new clients should use the header.
 */
export const TOKEN_REFRESHED_HEADER = 'X-Token-Refreshed';
const LEGACY_REFRESH_BODY_MESSAGE = 'Token refresh succeeded, retry request';

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

        if (
            message.includes('jwt expired') ||
            message.includes('Token expirado') ||
            message.includes('No auth token') ||
            message === 'Unauthorized'
        ) {
            this.logger.debug(`Auth error caught: "${message}", attempting refresh...`);
            try {
                await this.handleTokenRefresh(request, response);
                return;
            } catch (error) {
                // Expected outcome when the user simply isn't logged in (no refresh cookie,
                // or refresh token expired). Keep at debug to avoid noisy ERROR logs.
                this.logger.debug(
                    `Refresh skipped: ${error instanceof Error ? error.message : String(error)}`,
                );
                // Fall through to 401 below
            }
        }

        response.status(401).json({
            statusCode: 401,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message || 'Unauthorized',
        });
    }

    private async handleTokenRefresh(request: Request, response: Response) {
        const refreshToken = request.cookies?.refresh_token;
        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token found');
        }

        const userId = await this.tokenService.validateRefreshToken(refreshToken);
        if (!userId) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.userRepository.findPublicInfo(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const newAccessToken = this.tokenService.generateAccessToken(user);

        const env = process.env.NODE_ENV || 'development';
        response.cookie(AuthConstants.COOKIES.ACCESS_TOKEN_NAME, newAccessToken, {
            httpOnly: AuthConstants.COOKIES.OPTIONS.httpOnly,
            secure: AuthConstants.COOKIES.OPTIONS.secure(env),
            sameSite: AuthConstants.COOKIES.OPTIONS.sameSite(env),
            maxAge: AuthConstants.TOKENS.ACCESS_TOKEN_EXPIRES,
            path: AuthConstants.COOKIES.OPTIONS.path,
        });

        this.logger.log(`Access token refreshed for user: ${user.username}`);

        // Signal refresh via a typed response header (preferred) AND keep the body
        // message for back-compat with the previous front interceptor.
        response.setHeader(TOKEN_REFRESHED_HEADER, 'true');
        response.status(401).json({
            statusCode: 401,
            message: LEGACY_REFRESH_BODY_MESSAGE,
            refreshed: true,
        });
    }
}
