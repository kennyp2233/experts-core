import { Injectable } from '@nestjs/common';
import { FraudReason } from '../enums/fraud-reason.enum';

export interface ValidationResult {
  isValid: boolean;
  isSuspicious: boolean;
  reason?: FraudReason;
  message?: string;
  severity: number; // 0-100 fraud score points
  details?: any;
}

@Injectable()
export class TemporalValidatorDomainService {
  private readonly QR_TOLERANCE_MINUTES = 6;
  private readonly DEVICE_TIME_TOLERANCE_MINUTES = 5;

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
   * Validar horarios de trabajo normales
   */
  validateWorkingHours(recordTime: Date, isEntry: boolean): ValidationResult {
    const hour = recordTime.getHours();
    const minute = recordTime.getMinutes();
    const timeDecimal = hour + minute / 60;

    let expectedRange: { start: number; end: number; name: string };
    
    if (isEntry) {
      expectedRange = { start: 6, end: 10, name: 'entry' }; // 6:00 AM - 10:00 AM
    } else {
      expectedRange = { start: 14, end: 20, name: 'exit' }; // 2:00 PM - 8:00 PM
    }

    // Check if outside normal hours
    if (timeDecimal < expectedRange.start || timeDecimal > expectedRange.end) {
      const isVeryUnusual = (isEntry && (timeDecimal < 4 || timeDecimal > 12)) || 
                           (!isEntry && (timeDecimal < 12 || timeDecimal > 22));
      
      return {
        isValid: true,
        isSuspicious: true,
        reason: FraudReason.UNUSUAL_WORK_HOURS,
        message: `${expectedRange.name} time outside normal hours (${recordTime.toLocaleTimeString()})`,
        severity: isVeryUnusual ? 15 : 8,
        details: {
          recordTime: recordTime.toISOString(),
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
      message: 'Validación de horario laboral exitosa',
    };
  }
}
