import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { TrustedDeviceRepository } from '../repositories';
import { DeviceInfo } from '../utils/device-fingerprint.utils';
import { AuthConstants } from '../config/auth.constants';

/**
 * Servicio para gestión de dispositivos confiables
 * Responsabilidad: Verificar, marcar y gestionar dispositivos confiables para 2FA
 */
@Injectable()
export class TrustedDevicesService {
  private readonly logger = new Logger(TrustedDevicesService.name);

  constructor(
    private readonly trustedDeviceRepository: TrustedDeviceRepository,
  ) {}

  /**
   * Verifica si un dispositivo es confiable
   */
  async isTrusted(userId: string, fingerprint: string): Promise<boolean> {
    try {
      const device = await this.trustedDeviceRepository.findByUserAndFingerprint(
        userId,
        fingerprint,
      );

      if (!device) {
        return false;
      }

      // Verificar si no ha expirado
      if (device.expiresAt < new Date()) {
        await this.trustedDeviceRepository.deleteById(device.id);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error checking trusted device: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Marca un dispositivo como confiable
   */
  async trust(
    userId: string,
    fingerprint: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
  ): Promise<void> {
    try {
      const trustToken = randomBytes(32).toString('hex');
      const expiresAt = addDays(
        new Date(),
        AuthConstants.TRUSTED_DEVICES.TRUST_DURATION_DAYS,
      );

      // Limitar a máximo de dispositivos
      const count = await this.trustedDeviceRepository.countByUser(userId);

      if (count >= AuthConstants.TRUSTED_DEVICES.MAX_DEVICES_PER_USER) {
        // Eliminar el más antiguo
        const oldest = await this.trustedDeviceRepository.findOldestByUser(
          userId,
        );
        if (oldest) {
          await this.trustedDeviceRepository.deleteById(oldest.id);
        }
      }

      await this.trustedDeviceRepository.upsert(userId, fingerprint, {
        trustToken,
        deviceName: deviceInfo.deviceName,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
        lastIpAddress: ipAddress,
        expiresAt,
      });

      this.logger.log(
        `Device trusted for user ${userId}: ${deviceInfo.deviceName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error trusting device: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al confiar en el dispositivo',
      );
    }
  }

  /**
   * Actualiza última vez que se usó el dispositivo
   */
  async updateLastUsed(
    userId: string,
    fingerprint: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      await this.trustedDeviceRepository.updateLastUsed(
        userId,
        fingerprint,
        ipAddress,
      );
    } catch (error) {
      this.logger.error(
        `Error updating device last used: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Obtiene todos los dispositivos confiables de un usuario
   */
  async getAll(userId: string): Promise<any[]> {
    try {
      return await this.trustedDeviceRepository.findAllByUser(userId);
    } catch (error) {
      this.logger.error(
        `Error getting trusted devices: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Elimina un dispositivo confiable específico
   */
  async remove(userId: string, deviceId: string): Promise<boolean> {
    try {
      const device = await this.trustedDeviceRepository.findByIdAndUser(
        deviceId,
        userId,
      );

      if (!device) {
        return false;
      }

      await this.trustedDeviceRepository.deleteById(deviceId);

      this.logger.log(`Trusted device removed: ${deviceId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error removing trusted device: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al eliminar dispositivo confiable',
      );
    }
  }

  /**
   * Elimina TODOS los dispositivos confiables de un usuario
   */
  async removeAll(userId: string): Promise<number> {
    try {
      const result = await this.trustedDeviceRepository.deleteAllByUser(userId);

      this.logger.log(`All trusted devices removed for user: ${userId}`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Error removing all trusted devices: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al eliminar dispositivos confiables',
      );
    }
  }
}
