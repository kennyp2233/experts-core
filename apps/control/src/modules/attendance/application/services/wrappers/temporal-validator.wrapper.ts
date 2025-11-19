import { Injectable } from '@nestjs/common';
import { IFraudValidator, ValidatorCategory } from '../../../domain/interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext } from '../../../domain/services/anti-fraud-validator.domain-service';
import { TemporalValidatorDomainService, ValidationResult } from '../../../domain/services/temporal-validator.domain-service';
import { AttendanceType } from '../../../domain/enums/attendance-type.enum';
import { FraudReason } from '../../../domain/enums/fraud-reason.enum';
import { VALIDATION_MESSAGES } from '../../../domain/constants/validation-messages.constants';

/**
 * Wrapper para TemporalValidatorDomainService
 * Adapta el validator legacy al nuevo patrón Strategy
 */
@Injectable()
export class TemporalValidatorWrapper implements IFraudValidator {
  readonly name = 'TemporalValidator';
  readonly category = ValidatorCategory.TEMPORAL;

  constructor(private readonly temporalValidator: TemporalValidatorDomainService) {}

  async validate(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const currentTime = new Date();

    // Validar timing del QR solo si se usó QR (no código de excepción)
    if (data.qrCodeUsed) {
      const qrTimestamp = this.extractTimestampFromQR(data.qrCodeUsed);
      if (qrTimestamp) {
        results.push(this.temporalValidator.validateQRTiming(qrTimestamp, currentTime));
      }
    } else if (data.exceptionCodeUsed) {
      // Para códigos de excepción, agregar una validación temporal básica
      results.push({
        isValid: true,
        isSuspicious: false,
        severity: 0,
        message: VALIDATION_MESSAGES.GENERAL.EXCEPTION_CODE_LIMITED_VALIDATION(),
      });
    }

    // Validar tiempo del dispositivo
    results.push(this.temporalValidator.validateDeviceTime(data.timestamp, currentTime));

    // Validar secuencia de registros
    if (context.lastRecord) {
      results.push(
        this.temporalValidator.validateRecordSequence(
          context.lastRecord.timestamp,
          data.timestamp,
        ),
      );
    }

    // Validar horarios laborales (ahora con soporte de WorkSchedule configurables)
    results.push(
      await this.temporalValidator.validateWorkingHours(
        data.timestamp,
        data.workerId, // Ahora requiere workerId para horarios configurables
        data.type === AttendanceType.ENTRY,
      ),
    );

    return results;
  }

  /**
   * Extraer timestamp del QR
   */
  private extractTimestampFromQR(qrHash: string): Date | null {
    try {
      const qrJson = JSON.parse(qrHash);

      if (qrJson.timestamp) {
        const timestamp = new Date(qrJson.timestamp);
        return isNaN(timestamp.getTime()) ? null : timestamp;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}
