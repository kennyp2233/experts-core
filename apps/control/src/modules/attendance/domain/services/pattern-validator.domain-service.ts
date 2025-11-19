import { Injectable } from '@nestjs/common';
import { IFraudValidator, ValidatorCategory } from '../interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext } from './anti-fraud-validator.domain-service';
import { ValidationResult } from './temporal-validator.domain-service';
import { FraudReason } from '../enums/fraud-reason.enum';
import { AttendanceType } from '../enums/attendance-type.enum';
import { RecordStatus } from '../enums/record-status.enum';
import { AttendanceRecordEntity } from '../entities/attendance-record.entity';
import { VALIDATION_MESSAGES } from '../constants/validation-messages.constants';

/**
 * Validador de patrones de comportamiento
 *
 * Responsabilidades:
 * - Validar patrones de entrada/salida
 * - Detectar duplicados y secuencias inválidas
 * - Analizar historial de asistencia
 * - Validar dispositivos registrados (deshabilitado)
 */
@Injectable()
export class PatternValidatorDomainService implements IFraudValidator {
  readonly name = 'PatternValidator';
  readonly category = ValidatorCategory.PATTERN;

  async validate(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validar dispositivo registrado - DESHABILITADO TEMPORALMENTE
    // if (context.deviceInfo) {
    //   if (!context.deviceInfo.isRegistered) {
    //     results.push({
    //       isValid: false,
    //       isSuspicious: true,
    //       reason: FraudReason.UNKNOWN_DEVICE,
    //       message: VALIDATION_MESSAGES.PATTERN.DEVICE_NOT_REGISTERED(),
    //       severity: 20,
    //       details: {
    //         deviceId: data.deviceId,
    //         workerId: data.workerId,
    //       },
    //     });
    //   }
    // }

    // Validar patrones de entrada/salida
    if (data.type === AttendanceType.ENTRY) {
      results.push(this.validateEntryPattern(data, context));
    } else {
      results.push(this.validateExitPattern(data, context));
    }

    // Validar historial de asistencia
    if (context.workerAttendanceHistory) {
      results.push(this.validateAttendanceHistory(data, context.workerAttendanceHistory));
    }

    return results;
  }

  /**
   * Validar patrón de entrada
   */
  private validateEntryPattern(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): ValidationResult {
    // Verificar que no tenga entrada activa del día
    if (
      context.lastRecord &&
      context.lastRecord.type === AttendanceType.ENTRY &&
      this.isSameDay(context.lastRecord.timestamp, data.timestamp)
    ) {
      return {
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.DUPLICATE_ENTRY,
        message: VALIDATION_MESSAGES.PATTERN.DUPLICATE_ENTRY(
          context.lastRecord.timestamp.toISOString(),
        ),
        severity: 30,
        details: {
          lastEntryTime: context.lastRecord.timestamp.toISOString(),
          currentEntryTime: data.timestamp.toISOString(),
        },
      };
    }

    // Verificar que salió ayer (si aplica)
    if (
      context.lastRecord &&
      context.lastRecord.type === AttendanceType.ENTRY &&
      this.isYesterday(context.lastRecord.timestamp, data.timestamp)
    ) {
      return {
        isValid: true,
        isSuspicious: true,
        reason: FraudReason.MISSING_EXIT_PREVIOUS_DAY,
        message: VALIDATION_MESSAGES.PATTERN.MISSING_EXIT_PREVIOUS_DAY(
          context.lastRecord.timestamp.toISOString().split('T')[0],
        ),
        severity: 15,
        details: {
          lastEntryTime: context.lastRecord.timestamp.toISOString(),
          missingExitDate: context.lastRecord.timestamp.toISOString().split('T')[0],
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: VALIDATION_MESSAGES.PATTERN.ENTRY_PATTERN_VALID(),
    };
  }

  /**
   * Validar patrón de salida
   */
  private validateExitPattern(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): ValidationResult {
    // Verificar que tenga entrada del día
    if (
      !context.lastRecord ||
      context.lastRecord.type !== AttendanceType.ENTRY ||
      !this.isSameDay(context.lastRecord.timestamp, data.timestamp)
    ) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.INVALID_SHIFT_SEQUENCE,
        message: VALIDATION_MESSAGES.PATTERN.EXIT_WITHOUT_ENTRY(),
        severity: 25,
        details: {
          exitTime: data.timestamp.toISOString(),
          lastRecordType: context.lastRecord?.type || 'none',
          lastRecordTime: context.lastRecord?.timestamp.toISOString() || 'none',
        },
      };
    }

    // Validar duración del turno
    const shiftHours =
      (data.timestamp.getTime() - context.lastRecord.timestamp.getTime()) / (1000 * 60 * 60);

    if (shiftHours < 1) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.UNUSUAL_WORK_HOURS,
        message: VALIDATION_MESSAGES.PATTERN.SHIFT_TOO_SHORT(parseFloat(shiftHours.toFixed(2))),
        severity: 20,
        details: {
          shiftHours: shiftHours.toFixed(2),
          entryTime: context.lastRecord.timestamp.toISOString(),
          exitTime: data.timestamp.toISOString(),
        },
      };
    }

    if (shiftHours > 16) {
      return {
        isValid: true,
        isSuspicious: true,
        reason: FraudReason.UNUSUAL_WORK_HOURS,
        message: VALIDATION_MESSAGES.PATTERN.SHIFT_TOO_LONG(parseFloat(shiftHours.toFixed(2))),
        severity: 15,
        details: {
          shiftHours: shiftHours.toFixed(2),
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: VALIDATION_MESSAGES.PATTERN.EXIT_PATTERN_VALID(),
    };
  }

  /**
   * Validar historial de asistencia
   */
  private validateAttendanceHistory(
    data: AttendanceRecordValidationData,
    history: AttendanceRecordEntity[],
  ): ValidationResult {
    // Analizar patrones en el historial
    const recentRecords = history.slice(0, 10); // Últimos 10 registros
    const suspiciousCount = recentRecords.filter(
      (r) => r.status === RecordStatus.SUSPICIOUS,
    ).length;

    if (suspiciousCount > 3) {
      return {
        isValid: true,
        isSuspicious: true,
        message: VALIDATION_MESSAGES.PATTERN.HISTORY_TOO_MANY_SUSPICIOUS(
          suspiciousCount,
          recentRecords.length,
        ),
        severity: 10,
        details: {
          recentSuspiciousCount: suspiciousCount,
          totalRecentRecords: recentRecords.length,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: VALIDATION_MESSAGES.PATTERN.HISTORY_VALID(),
    };
  }

  /**
   * Verificar si dos fechas son del mismo día
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Verificar si date1 fue ayer respecto a date2
   */
  private isYesterday(date1: Date, date2: Date): boolean {
    const yesterday = new Date(date2);
    yesterday.setDate(yesterday.getDate() - 1);
    return date1.toDateString() === yesterday.toDateString();
  }
}
