import { Injectable, Inject, Logger } from '@nestjs/common';
import { GenerateExceptionCodeUseCase } from '../use-cases/generate-exception-code.use-case';
import { ValidateExceptionCodeUseCase } from '../use-cases/validate-exception-code.use-case';
import { ListExceptionCodesUseCase } from '../use-cases/list-exception-codes.use-case';
import { GenerateExceptionCodeDto } from '../dto/generate-exception-code.dto';
import { ValidateExceptionCodeDto, ExceptionCodeValidationResult } from '../use-cases/validate-exception-code.use-case';
import { ListExceptionCodesDto, ListExceptionCodesResult } from '../use-cases/list-exception-codes.use-case';
import { GenerateExceptionCodeResponseDto } from '../dto/exception-code.dto';
import type { ExceptionCodeRepositoryInterface } from '../../domain/repositories/exception-code.repository.interface';
import { ExceptionCodeStatus } from '../../domain/enums/exception-code-status.enum';

@Injectable()
export class ExceptionCodeService {
  private readonly logger = new Logger(ExceptionCodeService.name);

  constructor(
    private readonly generateExceptionCodeUseCase: GenerateExceptionCodeUseCase,
    private readonly validateExceptionCodeUseCase: ValidateExceptionCodeUseCase,
    private readonly listExceptionCodesUseCase: ListExceptionCodesUseCase,
    @Inject('ExceptionCodeRepository')
    private readonly exceptionCodeRepository: ExceptionCodeRepositoryInterface,
  ) {}

  async generateExceptionCode(dto: GenerateExceptionCodeDto, adminId: string): Promise<GenerateExceptionCodeResponseDto> {
    const result = await this.generateExceptionCodeUseCase.execute(dto, adminId);

    return {
      success: true,
      data: result,
      message: 'Código de excepción generado exitosamente'
    };
  }

  async validateExceptionCode(dto: ValidateExceptionCodeDto): Promise<{
    success: boolean;
    data: ExceptionCodeValidationResult;
    message: string;
  }> {
    const result = await this.validateExceptionCodeUseCase.execute(dto);

    return {
      success: true,
      data: result,
      message: result.isValid ? 'Código de excepción válido' : 'Código de excepción inválido'
    };
  }

  async listExceptionCodes(dto: ListExceptionCodesDto = {}): Promise<{
    success: boolean;
    data: ListExceptionCodesResult;
    message: string;
  }> {
    const result = await this.listExceptionCodesUseCase.execute(dto);

    return {
      success: true,
      data: result,
      message: 'Códigos de excepción obtenidos exitosamente'
    };
  }

  /**
   * Marca un código de excepción como usado después de un registro exitoso
   * @param codeId ID del código de excepción
   * @param attendanceRecordId ID del registro de asistencia (para logging)
   */
  async markExceptionCodeAsUsed(codeId: string, attendanceRecordId?: string): Promise<void> {
    this.logger.debug('Marcando código de excepción como usado:', {
      codeId,
      attendanceRecordId,
      usedAt: new Date().toISOString()
    });

    await this.exceptionCodeRepository.updateExceptionCodeStatus(
      codeId,
      ExceptionCodeStatus.USED,
      new Date()
    );

    this.logger.debug('Código de excepción marcado como usado exitosamente');
  }
}