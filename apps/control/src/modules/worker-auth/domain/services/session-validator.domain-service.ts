import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import type { WorkerAuthRepositoryInterface } from '../repositories/worker-auth.repository.interface';

export interface SessionInfo {
  worker: any;
  device: any;
  lastActivity: Date;
}

@Injectable()
export class SessionValidatorDomainService {
  constructor(
    private readonly workerAuthRepository: WorkerAuthRepositoryInterface
  ) {}

  async validateSession(sessionToken: string): Promise<SessionInfo> {
    const device = await this.workerAuthRepository.findDeviceBySessionToken(sessionToken);
    
    if (!device || !device.isLoggedIn) {
      throw new UnauthorizedException('Invalid session');
    }
    
    if (!device.worker.isAuthenticated) {
      throw new UnauthorizedException('Worker session expired');
    }

    // Verificar expiración de sesión si está configurada
    if (device.sessionExpiry && device.sessionExpiry < new Date()) {
      throw new UnauthorizedException('Session expired');
    }
    
    // Actualizar última actividad
    await this.workerAuthRepository.updateDeviceActivity(device.id);
    
    return {
      worker: device.worker,
      device: device,
      lastActivity: new Date(),
    };
  }

  async validateWorkerAccess(workerId: string): Promise<boolean> {
    const worker = await this.workerAuthRepository.findWorkerById(workerId);
    
    if (!worker) {
      return false;
    }

    return worker.status === 'ACTIVE' && worker.isAuthenticated;
  }

  async revokeWorkerSessions(workerId: string): Promise<void> {
    // Actualizar worker como no autenticado
    await this.workerAuthRepository.updateWorkerAuthentication(workerId, false);

    // Obtener y revocar todas las sesiones activas
    const activeSessions = await this.workerAuthRepository.findActiveSessionsByWorker(workerId);
    
    for (const session of activeSessions) {
      await this.workerAuthRepository.revokeSession(session.sessionToken.getValue());
    }
  }
}
