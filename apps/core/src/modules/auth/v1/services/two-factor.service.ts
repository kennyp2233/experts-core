import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { REDIS_CLIENT } from '../../../../redis/redis.module';
import { AuthConstants } from '../config/auth.constants';
import { UserRepository } from '../repositories';
import { TwoFactorSecret, TwoFactorLoginSession } from '../interfaces';

/**
 * Servicio para gestión de autenticación de dos factores (2FA)
 * Responsabilidad: Generación de secretos TOTP, validación de códigos 2FA, QR codes
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Genera un secreto TOTP y QR code para habilitar 2FA
   */
  async generateSecret(
    userId: string,
    email: string,
  ): Promise<TwoFactorSecret> {
    try {
      const secret = authenticator.generateSecret();

      // Guardar temporalmente en Redis
      const key = AuthConstants.REDIS_KEYS.TWO_FACTOR_PENDING(userId);
      await this.redis.setex(
        key,
        AuthConstants.TWO_FACTOR.SECRET_EXPIRY_SECONDS,
        JSON.stringify({ secret }),
      );

      // Generar URL para QR
      const otpauthUrl = authenticator.keyuri(
        email,
        AuthConstants.TWO_FACTOR.ISSUER,
        secret,
      );

      // Generar QR code
      const qrCode = await qrcode.toDataURL(otpauthUrl);

      this.logger.log(`2FA secret generated for user: ${userId}`);
      return { secret, qrCode };
    } catch (error) {
      this.logger.error(
        `Error generating 2FA secret: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al generar código 2FA');
    }
  }

  /**
   * Confirma la habilitación de 2FA validando el código TOTP
   */
  async confirmEnable(userId: string, token: string): Promise<boolean> {
    try {
      // Recuperar secreto temporal
      const key = AuthConstants.REDIS_KEYS.TWO_FACTOR_PENDING(userId);
      const data = await this.redis.get(key);

      if (!data) {
        throw new BadRequestException(
          'Sesión 2FA expirada. Genera un nuevo código QR',
        );
      }

      const { secret } = JSON.parse(data);

      // Validar código TOTP
      const isValid = authenticator.verify({ token, secret });

      if (!isValid) {
        throw new UnauthorizedException('Código 2FA inválido');
      }

      // Guardar en base de datos
      await this.userRepository.update2FASettings(userId, {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
      });

      // Limpiar temporal
      await this.redis.del(key);

      this.logger.log(`2FA enabled successfully for user: ${userId}`);
      return true;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `Error confirming 2FA: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al confirmar 2FA');
    }
  }

  /**
   * Valida un código TOTP para login 2FA
   */
  async verifyCode(userId: string, token: string): Promise<boolean> {
    try {
      const user = await this.userRepository.get2FAInfo(userId);

      if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
        throw new BadRequestException('2FA no está habilitado');
      }

      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorSecret,
      });

      if (!isValid) {
        throw new UnauthorizedException('Código 2FA inválido');
      }

      return true;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `Error verifying 2FA code: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al verificar código 2FA');
    }
  }

  /**
   * Deshabilita 2FA para un usuario
   */
  async disable(userId: string): Promise<boolean> {
    try {
      await this.userRepository.update2FASettings(userId, {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      });

      // Limpiar de Redis si existe
      const pendingKey = AuthConstants.REDIS_KEYS.TWO_FACTOR_PENDING(userId);
      await this.redis.del(pendingKey);

      this.logger.log(`2FA disabled for user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error disabling 2FA: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al deshabilitar 2FA');
    }
  }

  /**
   * Verifica si el usuario tiene 2FA habilitado
   */
  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.userRepository.get2FAInfo(userId);
    return user?.twoFactorEnabled ?? false;
  }

  /**
   * Guarda una sesión temporal de login 2FA en Redis
   */
  async saveLoginSession(
    tempToken: string,
    session: TwoFactorLoginSession,
  ): Promise<void> {
    const key = AuthConstants.REDIS_KEYS.TWO_FACTOR_LOGIN(tempToken);
    await this.redis.setex(
      key,
      AuthConstants.TWO_FACTOR.LOGIN_SESSION_EXPIRY_SECONDS,
      JSON.stringify(session),
    );
  }

  /**
   * Recupera y elimina una sesión temporal de login 2FA
   */
  async getAndRemoveLoginSession(
    tempToken: string,
  ): Promise<TwoFactorLoginSession | null> {
    const key = AuthConstants.REDIS_KEYS.TWO_FACTOR_LOGIN(tempToken);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    await this.redis.del(key);
    return JSON.parse(data);
  }
}
