import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@internal/usuarios-client';
import { DeviceInfo } from '../utils/device-fingerprint.utils';

/**
 * Repositorio para operaciones de dispositivos confiables
 * Abstrae el acceso a Prisma para facilitar testing y mantenimiento
 */
@Injectable()
export class TrustedDeviceRepository {
  constructor(
    @Inject('PrismaClientUsuarios') private readonly prisma: PrismaClient,
  ) { }

  /**
   * Encuentra un dispositivo por userId y fingerprint
   */
  async findByUserAndFingerprint(userId: string, fingerprint: string) {
    return this.prisma.trustedDevice.findUnique({
      where: {
        userId_fingerprint: {
          userId,
          fingerprint,
        },
      },
    });
  }

  /**
   * Cuenta dispositivos de un usuario
   */
  async countByUser(userId: string): Promise<number> {
    return this.prisma.trustedDevice.count({
      where: { userId },
    });
  }

  /**
   * Encuentra el dispositivo más antiguo de un usuario
   */
  async findOldestByUser(userId: string) {
    return this.prisma.trustedDevice.findFirst({
      where: { userId },
      orderBy: { lastUsedAt: 'asc' },
    });
  }

  /**
   * Elimina un dispositivo por ID
   */
  async deleteById(deviceId: string) {
    return this.prisma.trustedDevice.delete({
      where: { id: deviceId },
    });
  }

  /**
   * Crea o actualiza un dispositivo confiable
   */
  async upsert(
    userId: string,
    fingerprint: string,
    data: {
      trustToken: string;
      deviceName: string;
      browser: string;
      os: string;
      deviceType: string;
      lastIpAddress: string;
      expiresAt: Date;
    },
  ) {
    return this.prisma.trustedDevice.upsert({
      where: {
        userId_fingerprint: {
          userId,
          fingerprint,
        },
      },
      update: {
        trustToken: data.trustToken,
        lastUsedAt: new Date(),
        lastIpAddress: data.lastIpAddress,
        expiresAt: data.expiresAt,
      },
      create: {
        userId,
        fingerprint,
        trustToken: data.trustToken,
        deviceName: data.deviceName,
        browser: data.browser,
        os: data.os,
        deviceType: data.deviceType,
        lastIpAddress: data.lastIpAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Actualiza última vez usado
   */
  async updateLastUsed(
    userId: string,
    fingerprint: string,
    ipAddress: string,
  ) {
    return this.prisma.trustedDevice.updateMany({
      where: { userId, fingerprint },
      data: {
        lastUsedAt: new Date(),
        lastIpAddress: ipAddress,
      },
    });
  }

  /**
   * Lista todos los dispositivos de un usuario
   */
  async findAllByUser(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        browser: true,
        os: true,
        deviceType: true,
        lastUsedAt: true,
        lastIpAddress: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Encuentra un dispositivo por ID y userId
   */
  async findByIdAndUser(deviceId: string, userId: string) {
    return this.prisma.trustedDevice.findFirst({
      where: { id: deviceId, userId },
    });
  }

  /**
   * Elimina todos los dispositivos de un usuario
   */
  async deleteAllByUser(userId: string) {
    return this.prisma.trustedDevice.deleteMany({
      where: { userId },
    });
  }
}
