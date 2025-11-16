import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '.prisma/usuarios-client';
import { Response } from 'express';
import { AuthService } from '../auth.service';

/**
 * Interceptor que detecta cuando un JWT expira y automáticamente
 * intenta renovarlo usando el refresh token de las cookies.
 *
 * Esto hace que el refresh sea transparente para el frontend.
 */
@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TokenRefreshInterceptor.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private authService: AuthService,
    @Inject('PrismaClientUsuarios') private prisma: PrismaClient,
  ) { }

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

      // Validar refresh token
      const userId = await this.authService.validateRefreshToken(refreshToken);

      if (!userId) {
        this.logger.debug('Invalid or expired refresh token');
        throw new UnauthorizedException('Refresh token inválido o expirado');
      }


      const user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found or inactive`);
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }


      // Generar NUEVO access token
      const payload = {
        username: user.username,
        sub: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      const expiresIn = this.configService.get<string>('app.jwtExpiresIn') || '15m';
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: expiresIn as any });

      // Setear nueva cookie
      response.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutos
        path: '/',
      });

      // Actualizar el request para que tenga el nuevo token
      request.cookies.access_token = newAccessToken;

      // Actualizar también el user en el request para que los guards lo vean
      request.user = {
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
