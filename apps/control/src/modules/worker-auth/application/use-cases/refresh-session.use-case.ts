import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { WorkerAuthRepositoryInterface } from '../../domain/repositories/worker-auth.repository.interface';
import { SessionInfoDto } from '../dto/session-info.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly workerAuthRepository: WorkerAuthRepositoryInterface,
  ) {}

  async execute(sessionToken: string): Promise<SessionInfoDto> {
    // 1. Buscar device por session token
    const device = await this.workerAuthRepository.findDeviceBySessionToken(sessionToken);
    
    if (!device || !device.isLoggedIn) {
      throw new UnauthorizedException('Sesión inválida');
    }
    
    if (!device.worker.isAuthenticated) {
      throw new UnauthorizedException('Worker no está autenticado');
    }

    // 2. Verificar expiración de sesión si está configurada
    if (device.sessionExpiry && device.sessionExpiry < new Date()) {
      // Marcar sesión como expirada
      await this.workerAuthRepository.revokeSession(sessionToken);
      throw new UnauthorizedException('Sesión expirada');
    }
    
    // 3. Actualizar última actividad
    await this.workerAuthRepository.updateDeviceActivity(device.id);
    
    // 4. Retornar información de sesión actualizada
    return plainToClass(SessionInfoDto, {
      sessionToken,
      worker: {
        id: device.worker.id,
        employeeId: device.worker.employeeId,
        firstName: device.worker.firstName,
        lastName: device.worker.lastName,
        depot: {
          id: device.worker.depot.id,
          name: device.worker.depot.name
        }
      },
      device: {
        id: device.id,
        deviceId: device.deviceId,
        model: device.model,
        platform: device.platform
      },
      loginTime: device.worker.lastLoginAt || new Date(),
      lastActivity: new Date(),
      expiresAt: device.sessionExpiry || undefined
    });
  }
}
