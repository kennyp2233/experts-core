import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import Redis from 'ioredis';
import { PrismaClient } from '.prisma/usuarios-client';
import { RegisterDto } from './dto/register.dto';
import { REDIS_CLIENT } from '../../../redis/redis.module';

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
}

