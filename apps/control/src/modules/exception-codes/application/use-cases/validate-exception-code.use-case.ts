import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import type { ExceptionCodeRepositoryInterface } from '../../domain/repositories/exception-code.repository.interface';
import { ExceptionCodeStatus } from '../../domain/enums/exception-code-status.enum';

export interface ValidateExceptionCodeDto {
  code: string;
}

export interface ExceptionCodeValidationResult {
  isValid: boolean;
  exceptionCode?: {
    id: string;
    code: string;
    workerId: string;
    worker: {
      employeeId: string;
      firstName: string;
      lastName: string;
    };
  };
  error?: string;
}

@Injectable()
export class ValidateExceptionCodeUseCase {
  private readonly logger = new Logger(ValidateExceptionCodeUseCase.name);

  constructor(
    @Inject('ExceptionCodeRepositoryInterface')
    private readonly exceptionCodeRepository: ExceptionCodeRepositoryInterface,
  ) {}

  async execute(dto: ValidateExceptionCodeDto): Promise<ExceptionCodeValidationResult> {
    this.logger.debug('Validando código de excepción:', dto.code);

    // 1. Buscar el código en la base de datos
    const exceptionCode = await this.exceptionCodeRepository.findExceptionCodeByCode(dto.code);

    if (!exceptionCode) {
      this.logger.debug('Código de excepción no encontrado:', dto.code);
      return {
        isValid: false,
        error: 'Código de excepción inválido o expirado'
      };
    }

    this.logger.debug('Código encontrado:', {
      id: exceptionCode.id,
      code: exceptionCode.code,
      status: exceptionCode.status,
      isExpired: exceptionCode.isExpired(),
      canBeUsed: exceptionCode.canBeUsed()
    });

    // 2. Verificar si puede ser usado
    if (!exceptionCode.canBeUsed()) {
      const error = exceptionCode.isExpired() ? 'Código de excepción expirado' : 'Código de excepción ya utilizado';
      this.logger.debug('Código no puede ser usado:', error);
      return {
        isValid: false,
        error
      };
    }

    // ⚠️ NO MARCAR COMO USADO AQUÍ - Se marcará después del registro exitoso
    this.logger.debug('Código de excepción es válido (aún no marcado como usado)');

    // 3. Obtener información del worker
    const worker = await this.exceptionCodeRepository.findWorkerById(exceptionCode.workerId);
    if (!worker) {
      this.logger.error('Worker no encontrado para código:', exceptionCode.workerId);
      return {
        isValid: false,
        error: 'Worker asociado al código no encontrado'
      };
    }

    return {
      isValid: true,
      exceptionCode: {
        id: exceptionCode.id,
        code: exceptionCode.code,
        workerId: exceptionCode.workerId,
        worker: {
          employeeId: worker.employeeId,
          firstName: worker.firstName,
          lastName: worker.lastName
        }
      }
    };
  }
}