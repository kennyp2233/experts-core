import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Response } from 'express';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthConstants } from '../config/auth.constants';

/**
 * Interceptor que detecta tokens JWT expirados y los renueva automáticamente
 * usando el refresh token almacenado en cookies.
 *
 * NOTA: Este interceptor está deshabilitado por defecto en AuthModule.
 * Para habilitarlo, descomentar el provider APP_INTERCEPTOR en auth.module.ts
 */
@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TokenRefreshInterceptor.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
  ) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Solo interceptar errores de JWT expirado
        if (
          error instanceof UnauthorizedException &&
          (error.message.includes('jwt expired') ||
            error.message.includes('Token expirado'))
        ) {
          this.logger.debug('JWT expired, attempting auto-refresh...');
          return this.handleTokenRefresh(context, error);
        }

        // Otros errores: propagarlos
        return throwError(() => error);
      }),
    );
  }

  private async handleTokenRefresh(
    context: ExecutionContext,
    originalError: any,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      // Extraer refresh token de cookie
      const refreshToken = request.cookies?.refresh_token;

      if (!refreshToken) {
        this.logger.debug('No refresh token found in cookies');
        throw new UnauthorizedException(
          'Token expirado y no hay refresh token disponible',
        );
      }

      // Validar refresh token usando TokenService
      const userId = await this.tokenService.validateRefreshToken(refreshToken);

      if (!userId) {
        this.logger.debug('Invalid or expired refresh token');
        throw new UnauthorizedException('Refresh token inválido o expirado');
      }

      // Obtener usuario usando Repository
      const user = await this.userRepository.findPublicInfo(userId);

      if (!user) {
        this.logger.warn(`User ${userId} not found or inactive`);
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      // Generar NUEVO access token usando TokenService
      const newAccessToken = this.tokenService.generateAccessToken(user);

      // Setear nueva cookie usando AuthConstants
      const env = process.env.NODE_ENV || 'development';
      response.cookie(AuthConstants.COOKIES.ACCESS_TOKEN_NAME, newAccessToken, {
        httpOnly: AuthConstants.COOKIES.OPTIONS.httpOnly,
        secure: AuthConstants.COOKIES.OPTIONS.secure(env),
        sameSite: AuthConstants.COOKIES.OPTIONS.sameSite(env),
        maxAge: AuthConstants.TOKENS.ACCESS_TOKEN_EXPIRES,
        path: AuthConstants.COOKIES.OPTIONS.path,
      });

      // Actualizar el request con el nuevo token
      request.cookies.access_token = newAccessToken;

      // Actualizar el user en el request para los guards
      request.user = {
        sub: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      this.logger.log(`Access token refreshed successfully for user: ${user.username}`);

      // Indicar que el refresh fue exitoso (el request continúa normalmente)
      // No retornamos Observable aquí, dejamos que el handler original continúe
      return throwError(
        () => new UnauthorizedException('Token refresh succeeded, retry request'),
      );
    } catch (err) {
      this.logger.error('Error during token refresh:', err.message);
      return throwError(
        () => new UnauthorizedException('Error al refrescar token de autenticación'),
      );
    }
  }
}
