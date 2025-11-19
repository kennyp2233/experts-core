import { Injectable } from '@nestjs/common';
import { FraudReason } from '../enums/fraud-reason.enum';
import { WorkScheduleService } from '../../infrastructure/services/work-schedule.service';
import { ConfigurationService } from '../../infrastructure/services/configuration.service';
import { VALIDATION_MESSAGES } from '../constants/validation-messages.constants';
import { IFraudValidator, ValidatorCategory } from '../interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext } from './anti-fraud-validator.domain-service';
import { AttendanceType } from '../enums/attendance-type.enum';

export interface ValidationResult {
  isValid: boolean;
  isSuspicious: boolean;
  reason?: FraudReason;
  message?: string;
  severity: number; // 0-100 fraud score points
  details?: any;
}

@Injectable()
export class TemporalValidatorDomainService implements IFraudValidator {
  readonly name = 'TemporalValidator';
  readonly category = ValidatorCategory.TEMPORAL;
  // Valores por defecto (pueden ser sobrescritos por configuración)
  private QR_TOLERANCE_MINUTES = 6;
  private DEVICE_TIME_TOLERANCE_MINUTES = 5;

  constructor(
    private readonly workScheduleService: WorkScheduleService,
    private readonly configService: ConfigurationService,
  ) {}

  /**
   * Nivel 1: Validación Temporal del QR
   * Valida que el timestamp del QR esté dentro del rango de tolerancia
   */
  validateQRTiming(qrTimestamp: Date, currentTime: Date): ValidationResult {
    const diffMinutes = Math.abs(currentTime.getTime() - qrTimestamp.getTime()) / (1000 * 60);

    if (diffMinutes > this.QR_TOLERANCE_MINUTES) {
      const isFromFuture = qrTimestamp.getTime() > currentTime.getTime();

      return {
        isValid: false,
        isSuspicious: false,
        reason: isFromFuture ? FraudReason.QR_FROM_FUTURE : FraudReason.QR_EXPIRED,
        message: `Código QR ${isFromFuture ? 'del futuro' : 'expirado'} por ${diffMinutes.toFixed(1)} minutos (tolerancia: ${this.QR_TOLERANCE_MINUTES} min)`,
        severity: 30, // High severity for temporal violations
        details: {
          qrTimestamp: qrTimestamp.toISOString(),
          currentTime: currentTime.toISOString(),
          diffMinutes: diffMinutes.toFixed(1),
          tolerance: this.QR_TOLERANCE_MINUTES,
        },
      };
    }

    // Warning for QRs close to expiration
    if (diffMinutes > this.QR_TOLERANCE_MINUTES * 0.8) {
      return {
        isValid: true,
        isSuspicious: true,
        message: `QR code close to expiration (${diffMinutes.toFixed(1)} minutes old)`,
        severity: 5,
        details: {
          diffMinutes: diffMinutes.toFixed(1),
          tolerance: this.QR_TOLERANCE_MINUTES,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Validación de tiempo del QR exitosa',
    };
  }

  /**
   * Validar tiempo del dispositivo vs servidor
   */
  validateDeviceTime(deviceTimestamp: Date, serverTime: Date): ValidationResult {
    const diffMinutes = Math.abs(serverTime.getTime() - deviceTimestamp.getTime()) / (1000 * 60);

    if (diffMinutes > this.DEVICE_TIME_TOLERANCE_MINUTES) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.DEVICE_TIME_MISMATCH,
        message: `Device time differs by ${diffMinutes.toFixed(1)} minutes from server time`,
        severity: 15,
        details: {
          deviceTime: deviceTimestamp.toISOString(),
          serverTime: serverTime.toISOString(),
          diffMinutes: diffMinutes.toFixed(1),
          tolerance: this.DEVICE_TIME_TOLERANCE_MINUTES,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Validación de tiempo del dispositivo exitosa',
    };
  }

  /**
   * Validar secuencia temporal de registros
   */
  validateRecordSequence(lastRecordTime: Date | null, currentRecordTime: Date, minIntervalMinutes: number = 1): ValidationResult {
    if (!lastRecordTime) {
      return {
        isValid: true,
        isSuspicious: false,
        severity: 0,
        message: 'Primer registro del trabajador',
      };
    }

    const diffMinutes = (currentRecordTime.getTime() - lastRecordTime.getTime()) / (1000 * 60);

    // Check for records too close together (possible duplicate or rapid-fire attempt)
    if (diffMinutes < minIntervalMinutes) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.INVALID_SHIFT_SEQUENCE,
        message: `Record too close to previous record (${diffMinutes.toFixed(1)} minutes ago)`,
        severity: 20,
        details: {
          lastRecordTime: lastRecordTime.toISOString(),
          currentRecordTime: currentRecordTime.toISOString(),
          diffMinutes: diffMinutes.toFixed(1),
          minInterval: minIntervalMinutes,
        },
      };
    }

    // Check for records in the past (should not happen with proper client sync)
    if (diffMinutes < 0) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.INVALID_SHIFT_SEQUENCE,
        message: `Record timestamp is before last record`,
        severity: 25,
        details: {
          lastRecordTime: lastRecordTime.toISOString(),
          currentRecordTime: currentRecordTime.toISOString(),
          diffMinutes: diffMinutes.toFixed(1),
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Validación de secuencia de registros exitosa',
    };
  }

  /**
   * Validar horarios de trabajo usando WorkScheduleService
   * Ahora soporta horarios configurables por worker
   *
   * @param recordTime - Timestamp del registro
   * @param workerId - ID del worker (requerido para horarios configurables)
   * @param isEntry - true para entrada, false para salida
   */
  async validateWorkingHours(
    recordTime: Date,
    workerId: string,
    isEntry: boolean,
  ): Promise<ValidationResult> {
    // Delegar a WorkScheduleService
    return this.workScheduleService.validateWorkingHours(recordTime, workerId, isEntry);
  }

  /**
   * @deprecated Método legacy sin workerId - usar validateWorkingHours() con workerId
   */
  validateWorkingHoursLegacy(recordTime: Date, isEntry: boolean): ValidationResult {
    // Convertir a hora de Ecuador (UTC-5)
    const ecuadorTime = new Date(recordTime.getTime() - (5 * 60 * 60 * 1000));
    const hour = ecuadorTime.getHours();
    const minute = ecuadorTime.getMinutes();
    const timeDecimal = hour + minute / 60;

    let expectedRange: { start: number; end: number; name: string };

    if (isEntry) {
      expectedRange = { start: 21, end: 23, name: 'entry' }; // 9:00 PM - 11:00 PM Ecuador (turnos nocturnos)
    } else {
      expectedRange = { start: 6, end: 8, name: 'exit' }; // 6:00 AM - 8:00 AM Ecuador (turnos nocturnos)
    }

    // Check if outside normal hours
    if (timeDecimal < expectedRange.start || timeDecimal > expectedRange.end) {
      const isVeryUnusual = (isEntry && (timeDecimal < 19 || timeDecimal > 24)) ||
        (!isEntry && (timeDecimal < 4 || timeDecimal > 10));

      return {
        isValid: true,
        isSuspicious: true,
        reason: FraudReason.UNUSUAL_WORK_HOURS,
        message: VALIDATION_MESSAGES.TEMPORAL.WORKING_HOURS_OUTSIDE_RANGE(
          ecuadorTime.toLocaleTimeString('es-EC'),
          expectedRange.name,
          `${expectedRange.start}:00-${expectedRange.end}:00`,
        ),
        severity: isVeryUnusual ? 15 : 8,
        details: {
          recordTime: recordTime.toISOString(),
          ecuadorTime: ecuadorTime.toISOString(),
          hour: timeDecimal.toFixed(2),
          expectedRange,
          isVeryUnusual,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: VALIDATION_MESSAGES.TEMPORAL.WORKING_HOURS_VALID(),
    };
  }

  /**
   * Implementación de IFraudValidator
   * Ejecuta todas las validaciones temporales
   */
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
        results.push(this.validateQRTiming(qrTimestamp, currentTime));
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
    results.push(this.validateDeviceTime(data.timestamp, currentTime));

    // Validar secuencia de registros
    if (context.lastRecord) {
      results.push(
        this.validateRecordSequence(
          context.lastRecord.timestamp,
          data.timestamp,
        ),
      );
    }

    // Validar horarios laborales
    results.push(
      await this.validateWorkingHours(
        data.timestamp,
        data.workerId,
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
