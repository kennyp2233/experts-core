import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import type { WorkerAuthRepositoryInterface } from '../../domain/repositories/worker-auth.repository.interface';
import { GenerateLoginQRDto } from '../dto/generate-login-qr.dto';
import { LoginQRResponseDto } from '../dto/session-info.dto';
import { QRLoginToken } from '../../domain/value-objects/qr-login-token.vo';
import { LoginQRStatus } from '../../domain/enums/login-qr-status.enum';

@Injectable()
export class GenerateWorkerLoginQRUseCase {
  constructor(
    @Inject('WorkerAuthRepositoryInterface')
    private readonly workerAuthRepository: WorkerAuthRepositoryInterface,
  ) {}

  async execute(dto: GenerateLoginQRDto, adminId: string): Promise<LoginQRResponseDto> {
    // 1. Validar permisos de admin
    const hasPermissions = await this.workerAuthRepository.validateAdminPermissions(adminId);
    if (!hasPermissions) {
      throw new ForbiddenException('Admin no tiene permisos para generar QRs de login');
    }
    
    // 2. Validar que worker existe y está activo
    const worker = await this.workerAuthRepository.findWorkerById(dto.workerId);
    if (!worker || worker.status !== 'ACTIVE') {
      throw new BadRequestException('Worker no encontrado o inactivo');
    }

    // 3. Expirar QRs anteriores del worker (opcional)
    await this.workerAuthRepository.expireWorkerQRs(dto.workerId);

    // 4. Generar nuevo token
    const qrToken = new QRLoginToken(dto.workerId, adminId);

    // 5. Calcular expiración
    const expiresAt = dto.expiresInMinutes 
      ? new Date(Date.now() + dto.expiresInMinutes * 60 * 1000)
      : undefined;

    // 6. Crear registro en BD
    const loginQR = await this.workerAuthRepository.createLoginQR({
      qrToken: qrToken.getValue(),
      workerId: dto.workerId,
      adminId,
      expiresAt,
      status: LoginQRStatus.PENDING,
    });

    return {
      qrToken: loginQR.qrToken.getValue(),
      workerId: dto.workerId,
      worker: {
        employeeId: worker.employeeId,
        firstName: worker.firstName,
        lastName: worker.lastName
      },
      expiresAt: loginQR.expiresAt,
      generatedAt: loginQR.createdAt,
    };
  }
}
