import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { WorkerAuthRepositoryInterface } from '../../domain/repositories/worker-auth.repository.interface';
import { WorkerLoginDto } from '../dto/worker-login.dto';
import { SessionInfoDto } from '../dto/session-info.dto';
import { SessionToken } from '../../domain/value-objects/session-token.vo';
import { LoginQRStatus } from '../../domain/enums/login-qr-status.enum';
import { plainToClass } from 'class-transformer';

@Injectable()
export class AuthenticateWorkerUseCase {
  constructor(
    private readonly workerAuthRepository: WorkerAuthRepositoryInterface,
  ) {}

  async execute(dto: WorkerLoginDto): Promise<SessionInfoDto> {
    // 1. Validar QR
    const qr = await this.validateQRToken(dto.qrToken);
    
    // 2. Buscar o crear device
    const device = await this.findOrCreateDevice(dto.deviceInfo, qr.workerId);
    
    // 3. Generar sesión
    const sessionToken = new SessionToken();
    
    // 4. Actualizar BD en paralelo
    await Promise.all([
      this.workerAuthRepository.updateWorkerAuthentication(qr.workerId, true),
      this.workerAuthRepository.updateDeviceSession(device.id, {
        isLoggedIn: true,
        sessionToken: sessionToken.getValue(),
        lastActivityAt: new Date(),
      }),
      this.workerAuthRepository.updateQRStatus(qr.id, LoginQRStatus.USED, new Date()),
    ]);

    // 5. Obtener datos actualizados del worker
    const updatedWorker = await this.workerAuthRepository.findWorkerById(qr.workerId);

    // 6. Retornar info de sesión
    return this.buildSessionInfo(sessionToken.getValue(), updatedWorker, device);
  }

  private async validateQRToken(qrToken: string) {
    const qr = await this.workerAuthRepository.findQRByToken(qrToken);
    
    if (!qr) {
      throw new BadRequestException('Código QR no encontrado');
    }
    
    if (!qr.canBeUsed()) {
      if (qr.isExpired()) {
        throw new BadRequestException('Código QR ha expirado');
      }
      throw new BadRequestException('Código QR ya fue utilizado o no está disponible');
    }
    
    return qr;
  }

  private async findOrCreateDevice(deviceInfo: any, workerId: string) {
    let device = await this.workerAuthRepository.findDeviceByDeviceId(deviceInfo.deviceId);
    
    if (!device) {
      device = await this.workerAuthRepository.createDevice({
        deviceId: deviceInfo.deviceId,
        workerId,
        model: deviceInfo.model,
        platform: deviceInfo.platform,
        appVersion: deviceInfo.appVersion,
      });
    }
    
    return device;
  }

  private buildSessionInfo(sessionToken: string, worker: any, device: any): SessionInfoDto {
    return plainToClass(SessionInfoDto, {
      sessionToken,
      worker: {
        id: worker.id,
        employeeId: worker.employeeId,
        firstName: worker.firstName,
        lastName: worker.lastName,
        depot: {
          id: worker.depot.id,
          name: worker.depot.name
        }
      },
      device: {
        id: device.id,
        deviceId: device.deviceId,
        model: device.model,
        platform: device.platform
      },
      loginTime: new Date(),
      lastActivity: new Date(),
      expiresAt: device.sessionExpiry || undefined
    });
  }
}
