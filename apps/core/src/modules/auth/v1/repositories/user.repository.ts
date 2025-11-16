import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient, Role } from '.prisma/usuarios-client';

/**
 * Repositorio para operaciones de usuario
 * Abstrae el acceso a Prisma para facilitar testing y mantenimiento
 */
@Injectable()
export class UserRepository {
  constructor(
    @Inject('PrismaClientUsuarios') private readonly prisma: PrismaClient,
  ) {}

  /**
   * Encuentra un usuario por username
   */
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Encuentra un usuario por email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Encuentra un usuario por ID
   */
  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Encuentra un usuario por email o username
   */
  async findByEmailOrUsername(email: string, username: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
  }

  /**
   * Crea un nuevo usuario
   */
  async create(data: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * Actualiza el secreto y estado de 2FA
   */
  async update2FASettings(
    userId: string,
    settings: {
      twoFactorSecret?: string | null;
      twoFactorEnabled: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: settings,
    });
  }

  /**
   * Obtiene información de 2FA del usuario
   */
  async get2FAInfo(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });
  }

  /**
   * Obtiene usuario con información pública
   */
  async findPublicInfo(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}
