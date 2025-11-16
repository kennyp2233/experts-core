import { Injectable, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';
import { REDIS_CLIENT } from '../../../../redis/redis.module';
import { AuthConstants } from '../config/auth.constants';
import { TokenPayload, UserForToken } from '../interfaces';

/**
 * Servicio para gestión de tokens JWT y Refresh Tokens
 * Responsabilidad: Generación, validación y revocación de tokens
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Genera un JWT token a partir de información del usuario
   */
  generateAccessToken(user: UserForToken): string {
    const payload: TokenPayload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Genera un refresh token y lo guarda en Redis
   */
  async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const refreshToken = randomBytes(32).toString('hex');
    const expiresIn =
      this.configService.get<string>('app.refreshTokenExpiresIn') ||
      AuthConstants.TOKENS.REFRESH_TOKEN_EXPIRES;

    const ttlSeconds = this.parseDurationToSeconds(expiresIn);

    const key = AuthConstants.REDIS_KEYS.REFRESH_TOKEN(userId, refreshToken);

    await this.redis.setex(
      key,
      ttlSeconds,
      JSON.stringify({
        userId,
        createdAt: new Date().toISOString(),
        userAgent,
        ipAddress,
      }),
    );

    this.logger.log(`Refresh token generated for user: ${userId}`);
    return refreshToken;
  }

  /**
   * Valida un refresh token y retorna el userId
   */
  async validateRefreshToken(refreshToken: string): Promise<string | null> {
    try {
      const keys = await this.redis.keys(`refresh:*:${refreshToken}`);

      if (keys.length === 0) {
        return null;
      }

      const data = await this.redis.get(keys[0]);
      if (!data) {
        return null;
      }

      const { userId } = JSON.parse(data);
      return userId;
    } catch (error) {
      this.logger.error(
        `Error validating refresh token: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Revoca un refresh token específico
   */
  async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const key = AuthConstants.REDIS_KEYS.REFRESH_TOKEN(userId, refreshToken);
    await this.redis.del(key);
    this.logger.log(`Refresh token revoked for user: ${userId}`);
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const pattern = AuthConstants.REDIS_KEYS.REFRESH_TOKEN_PATTERN(userId);
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`All refresh tokens revoked for user: ${userId}`);
    }
  }

  /**
   * Convierte duraciones como '7d', '60m' a segundos
   */
  private parseDurationToSeconds(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return AuthConstants.TOKENS.REFRESH_TOKEN_EXPIRES_SECONDS;
    }
  }
}
