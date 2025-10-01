import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import type { ExceptionCodeRepositoryInterface } from '../../domain/repositories/exception-code.repository.interface';
import { GenerateExceptionCodeDto } from '../dto/generate-exception-code.dto';
import { ExceptionCodeResponseDto } from '../dto/exception-code.dto';
import { ExceptionCodeStatus } from '../../domain/enums/exception-code-status.enum';

@Injectable()
export class GenerateExceptionCodeUseCase {
  constructor(
    @Inject('ExceptionCodeRepositoryInterface')
    private readonly exceptionCodeRepository: ExceptionCodeRepositoryInterface,
  ) {}

  async execute(dto: GenerateExceptionCodeDto, adminId: string): Promise<ExceptionCodeResponseDto> {
    // 1. Validar permisos de admin
    const hasPermissions = await this.exceptionCodeRepository.validateAdminPermissions(adminId);
    if (!hasPermissions) {
      throw new ForbiddenException('Admin no tiene permisos para generar códigos de excepción');
    }

    // 2. Validar que worker existe y está activo
    const worker = await this.exceptionCodeRepository.findWorkerById(dto.workerId);
    if (!worker || worker.status !== 'ACTIVE') {
      throw new BadRequestException('Worker no encontrado o inactivo');
    }

    // 3. Expirar códigos anteriores del worker (opcional - mantener solo uno activo)
    await this.exceptionCodeRepository.expireWorkerExceptionCodes(dto.workerId);

    // 4. Generar código único de 6 dígitos
    const code = await this.generateUniqueCode();
    console.log('[DEBUG] Backend - Generando código de excepción único:', code);

    // 5. Calcular expiración
    const expiresAt = new Date(Date.now() + (dto.expiresInMinutes || 60) * 60 * 1000);
    console.log('[DEBUG] Backend - Código expira en:', expiresAt);

    // 6. Crear registro en BD
    const exceptionCode = await this.exceptionCodeRepository.createExceptionCode({
      code,
      workerId: dto.workerId,
      adminId,
      expiresAt,
      status: ExceptionCodeStatus.PENDING,
    });

    console.log('[DEBUG] Backend - Código de excepción guardado en BD:', {
      id: exceptionCode.id,
      code: exceptionCode.code,
      workerId: exceptionCode.workerId,
      status: exceptionCode.status,
      adminId: adminId
    });

    return {
      id: exceptionCode.id,
      code: exceptionCode.code,
      workerId: dto.workerId,
      worker: {
        employeeId: worker.employeeId,
        firstName: worker.firstName,
        lastName: worker.lastName
      },
      expiresAt: exceptionCode.expiresAt,
      generatedAt: exceptionCode.createdAt,
    };
  }

  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;

      // Verificar si el código ya existe
      const existingCode = await this.exceptionCodeRepository.findExceptionCodeByCode(code);
      if (!existingCode) {
        return code;
      }
    } while (attempts < maxAttempts);

    throw new BadRequestException('No se pudo generar un código único después de múltiples intentos');
  }
}