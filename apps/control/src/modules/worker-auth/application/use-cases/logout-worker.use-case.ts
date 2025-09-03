import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import type { WorkerAuthRepositoryInterface } from '../../domain/repositories/worker-auth.repository.interface';
import { LogoutDto, LogoutResponseDto } from '../dto/logout.dto';

@Injectable()
export class LogoutWorkerUseCase {
  private readonly logger = new Logger(LogoutWorkerUseCase.name);

  constructor(
    @Inject('WorkerAuthRepositoryInterface')
    private readonly workerAuthRepository: WorkerAuthRepositoryInterface,
  ) {}

  async execute(sessionToken: string, dto?: LogoutDto): Promise<LogoutResponseDto> {
    // 1. Buscar device por session token
    const device = await this.workerAuthRepository.findDeviceBySessionToken(sessionToken);
    
    if (!device || !device.isLoggedIn) {
      throw new UnauthorizedException('Sesión inválida');
    }

    // 2. Revocar la sesión específica
    await this.workerAuthRepository.revokeSession(sessionToken);

    // 3. Verificar si el worker tiene otras sesiones activas
    const activeSessions = await this.workerAuthRepository.findActiveSessionsByWorker(device.workerId);
    
    // 4. Si no hay más sesiones activas, marcar worker como no autenticado
    if (activeSessions.length === 0) {
      await this.workerAuthRepository.updateWorkerAuthentication(device.workerId, false);
    }

    this.logger.log(`Worker logout: ${device.worker.employeeId} from device ${device.deviceId}`);

    return {
      success: true,
      message: 'Sesión cerrada exitosamente'
    };
  }

  async executeForceLogout(workerId: string): Promise<LogoutResponseDto> {
    // 1. Verificar que el worker existe
    const worker = await this.workerAuthRepository.findWorkerById(workerId);
    
    if (!worker) {
      throw new UnauthorizedException('Worker no encontrado');
    }

    // 2. Obtener todas las sesiones activas del worker
    const activeSessions = await this.workerAuthRepository.findActiveSessionsByWorker(workerId);

    // 3. Revocar todas las sesiones
    for (const session of activeSessions) {
      await this.workerAuthRepository.revokeSession(session.sessionToken.getValue());
    }

    // 4. Marcar worker como no autenticado
    await this.workerAuthRepository.updateWorkerAuthentication(workerId, false);

    this.logger.log(`Force logout for worker: ${worker.employeeId} (${activeSessions.length} sessions revoked)`);

    return {
      success: true,
      message: `Todas las sesiones del worker han sido cerradas (${activeSessions.length} sesiones)`
    };
  }
}
