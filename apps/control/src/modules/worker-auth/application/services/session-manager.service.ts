import { Injectable } from '@nestjs/common';
import type { WorkerAuthRepositoryInterface } from '../../domain/repositories/worker-auth.repository.interface';
import { WorkerSessionEntity } from '../../domain/entities/worker-session.entity';
import { SessionInfoDto } from '../dto/session-info.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SessionManagerService {
  constructor(
    private readonly workerAuthRepository: WorkerAuthRepositoryInterface,
  ) {}

  async getActiveSessions(): Promise<{
    success: boolean;
    data: {
      sessions: SessionInfoDto[];
      total: number;
    };
  }> {
    const sessions = await this.workerAuthRepository.getActiveSessions();
    
    const sessionInfos = sessions.map(session => 
      plainToClass(SessionInfoDto, {
        sessionToken: session.sessionToken.getValue(),
        worker: {
          id: session.workerId,
          employeeId: 'N/A', // Se necesitaría incluir más datos del worker
          firstName: 'N/A',
          lastName: 'N/A',
          depot: {
            id: 'N/A',
            name: 'N/A'
          }
        },
        device: {
          id: session.deviceId,
          deviceId: session.deviceInfo.deviceId,
          model: session.deviceInfo.model,
          platform: session.deviceInfo.platform
        },
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      })
    );

    return {
      success: true,
      data: {
        sessions: sessionInfos,
        total: sessions.length
      }
    };
  }

  async revokeSession(sessionToken: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.workerAuthRepository.revokeSession(sessionToken);
    
    return {
      success: true,
      message: 'Sesión revocada exitosamente'
    };
  }

  async getQRStatus(qrToken: string): Promise<{
    success: boolean;
    data: {
      status: string;
      expiresAt?: Date;
      usedAt?: Date;
      worker?: any;
    };
  }> {
    const qr = await this.workerAuthRepository.findQRByToken(qrToken);
    
    if (!qr) {
      return {
        success: false,
        data: {
          status: 'NOT_FOUND'
        }
      };
    }

    const worker = await this.workerAuthRepository.findWorkerById(qr.workerId);

    return {
      success: true,
      data: {
        status: qr.status,
        expiresAt: qr.expiresAt,
        usedAt: qr.usedAt,
        worker: worker ? {
          employeeId: worker.employeeId,
          firstName: worker.firstName,
          lastName: worker.lastName
        } : undefined
      }
    };
  }
}
