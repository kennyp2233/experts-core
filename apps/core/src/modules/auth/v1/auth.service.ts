import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import Redis from 'ioredis';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { PrismaClient } from '.prisma/usuarios-client';
import { RegisterDto } from './dto/register.dto';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { DeviceFingerprintUtils, DeviceInfo } from './utils/device-fingerprint.utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    @Inject('PrismaClientUsuarios') private prisma: PrismaClient,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!user || !user.isActive) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al validar usuario');
    }
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const access_token = this.jwtService.sign(payload);
    
    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  generateToken(user: any): string {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return this.jwtService.sign(payload);
  }

  async register(data: RegisterDto): Promise<any> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { username: data.username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === data.email) {
          throw new ConflictException('El email ya está registrado');
        }
        if (existingUser.username === data.username) {
          throw new ConflictException('El username ya está en uso');
        }
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Crear usuario - SIEMPRE como USER por seguridad
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          username: data.username,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'USER', // Siempre USER, solo admin puede cambiar roles
          isActive: true,
        },
      });

      const { password: _, ...result } = user;
      this.logger.log(`New user registered: ${user.username}`);
      return result;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Error registering user: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al registrar usuario');
    }
  }

  /**
   * Genera un refresh token y lo guarda en Redis
   */
  async generateRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const refreshToken = randomBytes(32).toString('hex');
    const expiresIn = this.configService.get<string>('app.refreshTokenExpiresIn') || '7d';

    // Convertir '7d' a segundos (7 días = 604800 segundos)
    const ttlSeconds = this.parseDurationToSeconds(expiresIn);

    // Guardar en Redis
    await this.redis.setex(
      `refresh:${userId}:${refreshToken}`,
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
      // Buscar en Redis
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
      this.logger.error(`Error validating refresh token: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Revoca un refresh token
   */
  async revokeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh:${userId}:${refreshToken}`;
    await this.redis.del(key);
    this.logger.log(`Refresh token revoked for user: ${userId}`);
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const keys = await this.redis.keys(`refresh:${userId}:*`);
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
        return 7 * 24 * 60 * 60; // 7 días por defecto
    }
  }

  // ==================== 2FA METHODS ====================

  /**
   * Genera un secreto TOTP y QR code para habilitar 2FA
   */
  async generate2FASecret(userId: string, email: string): Promise<{ secret: string; qrCode: string }> {
    try {
      // Generar secreto TOTP
      const secret = authenticator.generateSecret();

      // Guardar temporalmente en Redis (10 minutos)
      await this.redis.setex(
        `2fa:pending:${userId}`,
        600, // 10 minutos
        JSON.stringify({ secret }),
      );

      // Generar URL para QR
      const otpauthUrl = authenticator.keyuri(email, 'ExpertsCore', secret);

      // Generar QR code como Data URL
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

      this.logger.log(`2FA secret generated for user: ${userId}`);
      return { secret, qrCode: qrCodeDataUrl };
    } catch (error) {
      this.logger.error(`Error generating 2FA secret: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al generar código 2FA');
    }
  }

  /**
   * Confirma la habilitación de 2FA validando el código TOTP
   */
  async confirm2FA(userId: string, token: string): Promise<boolean> {
    try {
      // Recuperar secreto temporal de Redis
      const data = await this.redis.get(`2fa:pending:${userId}`);

      if (!data) {
        throw new BadRequestException('Sesión 2FA expirada. Genera un nuevo código QR');
      }

      const { secret } = JSON.parse(data);

      // Validar código TOTP
      const isValid = authenticator.verify({ token, secret });

      if (!isValid) {
        throw new UnauthorizedException('Código 2FA inválido');
      }

      // Guardar en base de datos (TODO: uncomment when Prisma is ready)
      // await this.prisma.user.update({
      //   where: { id: userId },
      //   data: {
      //     twoFactorSecret: secret,
      //     twoFactorEnabled: true,
      //   },
      // });

      // Limpiar temporal de Redis
      await this.redis.del(`2fa:pending:${userId}`);

      this.logger.log(`2FA enabled successfully for user: ${userId}`);
      return true;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error confirming 2FA: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al confirmar 2FA');
    }
  }

  /**
   * Valida un código TOTP para login 2FA
   */
  async verify2FACode(userId: string, token: string): Promise<boolean> {
    try {
      // Obtener secreto de DB (TODO: uncomment when Prisma is ready)
      // const user = await this.prisma.user.findUnique({
      //   where: { id: userId },
      //   select: { twoFactorSecret: true, twoFactorEnabled: true },
      // });

      // if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      //   throw new BadRequestException('2FA no está habilitado');
      // }

      // Temporary: get from Redis pending (for testing)
      const data = await this.redis.get(`2fa:pending:${userId}`);
      if (!data) {
        throw new BadRequestException('No hay secreto 2FA configurado');
      }
      const { secret } = JSON.parse(data);

      // Validar TOTP
      const isValid = authenticator.verify({
        token,
        secret, // user.twoFactorSecret
      });

      if (!isValid) {
        throw new UnauthorizedException('Código 2FA inválido');
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error verifying 2FA code: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al verificar código 2FA');
    }
  }

  /**
   * Deshabilita 2FA para un usuario
   */
  async disable2FA(userId: string): Promise<boolean> {
    try {
      // TODO: Uncomment when Prisma is ready
      // await this.prisma.user.update({
      //   where: { id: userId },
      //   data: {
      //     twoFactorSecret: null,
      //     twoFactorEnabled: false,
      //   },
      // });

      // Limpiar cualquier sesión 2FA pendiente
      await this.redis.del(`2fa:pending:${userId}`);

      // Eliminar todos los dispositivos confiables
      await this.removeAllTrustedDevices(userId);

      this.logger.log(`2FA disabled for user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error disabling 2FA: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al deshabilitar 2FA');
    }
  }

  // ==================== TRUSTED DEVICES METHODS ====================

  /**
   * Verifica si un dispositivo es confiable
   */
  async isDeviceTrusted(userId: string, fingerprint: string): Promise<boolean> {
    try {
      // TODO: Uncomment when Prisma is ready
      // const device = await this.prisma.trustedDevice.findUnique({
      //   where: {
      //     userId_fingerprint: {
      //       userId,
      //       fingerprint,
      //     },
      //   },
      // });

      // if (!device) {
      //   return false;
      // }

      // // Verificar si no ha expirado
      // if (device.expiresAt < new Date()) {
      //   // Eliminar dispositivo expirado
      //   await this.prisma.trustedDevice.delete({
      //     where: { id: device.id },
      //   });
      //   return false;
      // }

      // return true;

      // Temporary: check in Redis
      const key = `trusted:${userId}:${fingerprint}`;
      const exists = await this.redis.get(key);
      return exists === '1';
    } catch (error) {
      this.logger.error(`Error checking trusted device: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Marca un dispositivo como confiable
   */
  async trustDevice(
    userId: string,
    fingerprint: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
  ): Promise<void> {
    try {
      const trustToken = randomBytes(32).toString('hex');
      const expiresAt = addDays(new Date(), 30); // 30 días de confianza

      // TODO: Uncomment when Prisma is ready
      // // Limitar a máximo 5 dispositivos
      // const count = await this.prisma.trustedDevice.count({
      //   where: { userId },
      // });

      // if (count >= 5) {
      //   // Eliminar el más antiguo
      //   const oldest = await this.prisma.trustedDevice.findFirst({
      //     where: { userId },
      //     orderBy: { lastUsedAt: 'asc' },
      //   });
      //   if (oldest) {
      //     await this.prisma.trustedDevice.delete({
      //       where: { id: oldest.id },
      //     });
      //   }
      // }

      // await this.prisma.trustedDevice.upsert({
      //   where: {
      //     userId_fingerprint: {
      //       userId,
      //       fingerprint,
      //     },
      //   },
      //   update: {
      //     trustToken,
      //     lastUsedAt: new Date(),
      //     lastIpAddress: ipAddress,
      //     expiresAt,
      //   },
      //   create: {
      //     userId,
      //     fingerprint,
      //     trustToken,
      //     deviceName: deviceInfo.deviceName,
      //     browser: deviceInfo.browser,
      //     os: deviceInfo.os,
      //     deviceType: deviceInfo.deviceType,
      //     lastIpAddress: ipAddress,
      //     expiresAt,
      //   },
      // });

      // Temporary: save in Redis (30 days)
      const key = `trusted:${userId}:${fingerprint}`;
      await this.redis.setex(key, 30 * 24 * 60 * 60, '1');

      this.logger.log(`Device trusted for user ${userId}: ${deviceInfo.deviceName}`);
    } catch (error) {
      this.logger.error(`Error trusting device: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al confiar en el dispositivo');
    }
  }

  /**
   * Actualiza última vez que se usó el dispositivo
   */
  async updateDeviceLastUsed(
    userId: string,
    fingerprint: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      // TODO: Uncomment when Prisma is ready
      // await this.prisma.trustedDevice.updateMany({
      //   where: {
      //     userId,
      //     fingerprint,
      //   },
      //   data: {
      //     lastUsedAt: new Date(),
      //     lastIpAddress: ipAddress,
      //   },
      // });

      // Temporary: refresh TTL in Redis
      const key = `trusted:${userId}:${fingerprint}`;
      await this.redis.expire(key, 30 * 24 * 60 * 60);
    } catch (error) {
      this.logger.error(`Error updating device last used: ${error.message}`, error.stack);
    }
  }

  /**
   * Obtiene todos los dispositivos confiables de un usuario
   */
  async getTrustedDevices(userId: string): Promise<any[]> {
    try {
      // TODO: Uncomment when Prisma is ready
      // return await this.prisma.trustedDevice.findMany({
      //   where: { userId },
      //   orderBy: { lastUsedAt: 'desc' },
      //   select: {
      //     id: true,
      //     deviceName: true,
      //     browser: true,
      //     os: true,
      //     deviceType: true,
      //     lastUsedAt: true,
      //     lastIpAddress: true,
      //     expiresAt: true,
      //     createdAt: true,
      //   },
      // });

      // Temporary: return empty array
      return [];
    } catch (error) {
      this.logger.error(`Error getting trusted devices: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Elimina un dispositivo confiable específico
   */
  async removeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      // TODO: Uncomment when Prisma is ready
      // const device = await this.prisma.trustedDevice.findFirst({
      //   where: {
      //     id: deviceId,
      //     userId,
      //   },
      // });

      // if (!device) {
      //   return false;
      // }

      // await this.prisma.trustedDevice.delete({
      //   where: { id: deviceId },
      // });

      this.logger.log(`Trusted device removed: ${deviceId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error removing trusted device: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al eliminar dispositivo confiable');
    }
  }

  /**
   * Elimina TODOS los dispositivos confiables de un usuario
   */
  async removeAllTrustedDevices(userId: string): Promise<number> {
    try {
      // TODO: Uncomment when Prisma is ready
      // const result = await this.prisma.trustedDevice.deleteMany({
      //   where: { userId },
      // });

      // Remove from Redis
      const keys = await this.redis.keys(`trusted:${userId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      this.logger.log(`All trusted devices removed for user: ${userId}`);
      return keys.length; // result.count;
    } catch (error) {
      this.logger.error(`Error removing all trusted devices: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al eliminar dispositivos confiables');
    }
  }
}

