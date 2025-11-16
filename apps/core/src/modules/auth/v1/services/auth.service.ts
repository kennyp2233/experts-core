import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { UserRepository } from '../repositories';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { TrustedDevicesService } from './trusted-devices.service';
import { UserInfo, UserForToken } from '../interfaces';
import { Role } from '.prisma/usuarios-client';

/**
 * Servicio principal de autenticación (Orquestador)
 * Responsabilidad: Coordinar el flujo de login, registro y validación
 * Delega operaciones específicas a servicios especializados
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService,
    private readonly trustedDevicesService: TrustedDevicesService,
  ) { }

  /**
   * Valida credenciales de usuario (usado por LocalStrategy)
   */
  async validateUser(username: string, password: string): Promise<UserInfo | null> {
    try {
      const user = await this.userRepository.findByUsername(username);

      if (!user || !user.isActive) {
        return null;
      }

      const isPasswordValid = await this.passwordService.validate(
        password,
        user.password,
      );

      if (!isPasswordValid) {
        return null;
      }

      // Retornar solo información segura
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al validar usuario');
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(data: RegisterDto): Promise<UserInfo> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findByEmailOrUsername(
        data.email,
        data.username,
      );

      if (existingUser) {
        if (existingUser.email === data.email) {
          throw new ConflictException('El email ya está registrado');
        }
        if (existingUser.username === data.username) {
          throw new ConflictException('El username ya está en uso');
        }
      }

      // Hash de la contraseña
      const hashedPassword = await this.passwordService.hash(data.password);

      // Crear usuario
      const user = await this.userRepository.create({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: Role.USER, // Siempre USER por seguridad
        isActive: true,
      });

      this.logger.log(`New user registered: ${user.username}`);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };
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
   * Genera tokens de acceso y refresh
   */
  async generateTokens(
    user: UserForToken,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      userAgent,
      ipAddress,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Obtiene información del usuario por ID
   */
  async getUserById(userId: string): Promise<UserInfo | null> {
    const user = await this.userRepository.findPublicInfo(userId);
    return user;
  }

  // ==================== DELEGACIÓN A SERVICIOS ESPECÍFICOS ====================

  /**
   * Token Service - Delegación
   */
  get tokens() {
    return {
      generateAccess: (user: UserForToken) => this.tokenService.generateAccessToken(user),
      generateRefresh: (userId: string, userAgent?: string, ipAddress?: string) =>
        this.tokenService.generateRefreshToken(userId, userAgent, ipAddress),
      validate: (token: string) => this.tokenService.validateRefreshToken(token),
      revoke: (userId: string, token: string) =>
        this.tokenService.revokeRefreshToken(userId, token),
      revokeAll: (userId: string) => this.tokenService.revokeAllRefreshTokens(userId),
    };
  }

  /**
   * Two Factor Service - Delegación
   */
  get twoFactor() {
    return {
      generateSecret: (userId: string, email: string) =>
        this.twoFactorService.generateSecret(userId, email),
      confirmEnable: (userId: string, token: string) =>
        this.twoFactorService.confirmEnable(userId, token),
      verify: (userId: string, token: string) =>
        this.twoFactorService.verifyCode(userId, token),
      disable: (userId: string) => this.twoFactorService.disable(userId),
      isEnabled: (userId: string) => this.twoFactorService.isEnabled(userId),
      saveLoginSession: (tempToken: string, session: any) =>
        this.twoFactorService.saveLoginSession(tempToken, session),
      getAndRemoveLoginSession: (tempToken: string) =>
        this.twoFactorService.getAndRemoveLoginSession(tempToken),
    };
  }

  /**
   * Trusted Devices Service - Delegación
   */
  get trustedDevices() {
    return {
      isTrusted: (userId: string, fingerprint: string) =>
        this.trustedDevicesService.isTrusted(userId, fingerprint),
      trust: (userId: string, fingerprint: string, deviceInfo: any, ipAddress: string) =>
        this.trustedDevicesService.trust(userId, fingerprint, deviceInfo, ipAddress),
      updateLastUsed: (userId: string, fingerprint: string, ipAddress: string) =>
        this.trustedDevicesService.updateLastUsed(userId, fingerprint, ipAddress),
      getAll: (userId: string) => this.trustedDevicesService.getAll(userId),
      remove: (userId: string, deviceId: string) =>
        this.trustedDevicesService.remove(userId, deviceId),
      removeAll: (userId: string) => this.trustedDevicesService.removeAll(userId),
    };
  }
}
