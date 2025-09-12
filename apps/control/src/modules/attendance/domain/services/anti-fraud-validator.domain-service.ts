import { Injectable } from '@nestjs/common';
import { TemporalValidatorDomainService, ValidationResult } from './temporal-validator.domain-service';
import { GeolocationValidatorDomainService, DepotLocation } from './geolocation-validator.domain-service';
import { PhotoValidatorDomainService } from './photo-validator.domain-service';
import { WorkHoursCalculatorDomainService } from './work-hours-calculator.domain-service';
import { FraudScore } from '../value-objects/fraud-score.vo';
import { FraudReason } from '../enums/fraud-reason.enum';
import { AttendanceType } from '../enums/attendance-type.enum';
import { RecordStatus } from '../enums/record-status.enum';
import { GPSCoordinate } from '../value-objects/gps-coordinate.vo';
import { PhotoMetadata } from '../value-objects/photo-metadata.vo';
import { AttendanceRecordEntity } from '../entities/attendance-record.entity';
import { CryptoUtils } from '../../../../utils/crypto.utils';

export interface AttendanceRecordValidationData {
  type: AttendanceType;
  timestamp: Date;
  qrCodeUsed: string;
  photoPath: string;
  photoMetadata?: {
    timestamp: string;
    hasCameraInfo: boolean;
    fileSize: number;
    dimensions?: { width: number; height: number };
    cameraInfo?: any;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  deviceId: string;
  workerId: string;
  createdOffline?: boolean;
}

export interface ValidationContext {
  depot: DepotLocation & { secret: string };
  lastRecord?: AttendanceRecordEntity;
  workerAttendanceHistory?: AttendanceRecordEntity[];
  deviceInfo?: {
    isRegistered: boolean;
    lastSeenAt?: Date;
  };
}

export interface ComprehensiveValidationResult {
  overallStatus: RecordStatus;
  fraudScore: FraudScore;
  validationResults: {
    temporal: ValidationResult[];
    cryptographic: ValidationResult[];
    geolocation: ValidationResult[];
    photo: ValidationResult[];
    pattern: ValidationResult[];
  };
  needsManualReview: boolean;
  recommendedAction: 'ACCEPT' | 'REVIEW' | 'REJECT';
  summary: string;
}

@Injectable()
export class AntiFraudValidatorDomainService {
  constructor(
    private readonly temporalValidator: TemporalValidatorDomainService,
    private readonly geolocationValidator: GeolocationValidatorDomainService,
    private readonly photoValidator: PhotoValidatorDomainService,
    private readonly workHoursCalculator: WorkHoursCalculatorDomainService,
  ) {}

  /**
   * Ejecutar validación anti-fraude completa (5 niveles)
   */
  async validateRecord(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ComprehensiveValidationResult> {
    const validationResults = {
      temporal: [] as ValidationResult[],
      cryptographic: [] as ValidationResult[],
      geolocation: [] as ValidationResult[],
      photo: [] as ValidationResult[],
      pattern: [] as ValidationResult[],
    };

    // Nivel 1: Validación Temporal
    validationResults.temporal = await this.performTemporalValidation(data, context);

    // Nivel 2: Validación Criptográfica
    validationResults.cryptographic = await this.performCryptographicValidation(data, context);

    // Nivel 3: Validación Geográfica
    validationResults.geolocation = await this.performGeolocationValidation(data, context);

    // Nivel 4: Validación Fotográfica - DESHABILITADA TEMPORALMENTE
    // validationResults.photo = await this.performPhotoValidation(data, context);

    // Nivel 5: Validación de Patrones
    validationResults.pattern = await this.performPatternValidation(data, context);

    // Combinar resultados y calcular puntuación final
    const fraudScore = this.calculateComprehensiveFraudScore(validationResults);
    const overallStatus = this.determineOverallStatus(fraudScore);
    const needsManualReview = fraudScore.needsManualReview();
    const recommendedAction = fraudScore.getRecommendedAction();
    const summary = this.generateValidationSummary(validationResults, fraudScore);

    return {
      overallStatus,
      fraudScore,
      validationResults,
      needsManualReview,
      recommendedAction,
      summary,
    };
  }

  /**
   * Nivel 1: Validación Temporal
   */
  private async performTemporalValidation(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const currentTime = new Date();

    // Validar timing del QR (asumiendo que el QR contiene timestamp)
    const qrTimestamp = this.extractTimestampFromQR(data.qrCodeUsed);
    if (qrTimestamp) {
      results.push(this.temporalValidator.validateQRTiming(qrTimestamp, currentTime));
    }

    // Validar tiempo del dispositivo
    results.push(this.temporalValidator.validateDeviceTime(data.timestamp, currentTime));

    // Validar secuencia de registros
    if (context.lastRecord) {
      results.push(this.temporalValidator.validateRecordSequence(
        context.lastRecord.timestamp,
        data.timestamp,
      ));
    }

    // Validar horarios laborales
    results.push(this.temporalValidator.validateWorkingHours(
      data.timestamp,
      data.type === AttendanceType.ENTRY,
    ));

    return results;
  }

  /**
   * Nivel 2: Validación Criptográfica
   */
  private async performCryptographicValidation(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    try {
      // Extraer timestamp y signature del QR JSON
      const qrTimestamp = this.extractTimestampFromQR(data.qrCodeUsed);
      const qrSignature = this.extractSignatureFromQR(data.qrCodeUsed);

      if (!qrSignature) {
        results.push({
          isValid: false,
          isSuspicious: false,
          reason: FraudReason.MALFORMED_QR_CODE,
          message: 'QR code format is invalid - missing signature',
          severity: 30,
          details: {
            qrData: data.qrCodeUsed?.substring(0, 100) + '...',
          },
        });
        return results;
      }

      // Validar autenticidad del QR usando la signature extraída
      const isValid = CryptoUtils.validateQRHash(
        qrSignature, // Usar la signature extraída en lugar del JSON completo
        context.depot.secret,
        context.depot.id,
        qrTimestamp || data.timestamp,
      );

      if (!isValid) {
        results.push({
          isValid: false,
          isSuspicious: false,
          reason: FraudReason.INVALID_QR_SIGNATURE,
          message: 'QR code cryptographic signature is invalid',
          severity: 35,
          details: {
            qrSignature: qrSignature?.substring(0, 16) + '...',
            depotId: context.depot.id,
            timestamp: qrTimestamp?.toISOString() || data.timestamp.toISOString(),
          },
        });
      } else {
        results.push({
          isValid: true,
          isSuspicious: false,
          severity: 0,
          message: 'QR cryptographic validation passed',
        });
      }
    } catch (error) {
      results.push({
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.MALFORMED_QR_CODE,
        message: 'QR code format is invalid or malformed',
        severity: 30,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          qrHash: data.qrCodeUsed,
        },
      });
    }

    return results;
  }

  /**
   * Nivel 3: Validación Geográfica
   */
  private async performGeolocationValidation(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Crear coordenada GPS del registro
    const recordCoordinate = GPSCoordinate.create(
      data.location.latitude,
      data.location.longitude,
      data.location.accuracy,
      new Date(data.location.timestamp),
    );

    // Validar realismo de coordenadas
    results.push(this.geolocationValidator.validateCoordinateRealism(recordCoordinate));

    // Validar ubicación dentro del geofence
    results.push(this.geolocationValidator.validateLocation(recordCoordinate, context.depot));

    // Validar velocidad de viaje
    if (context.lastRecord && context.lastRecord.gpsCoordinate) {
      results.push(this.geolocationValidator.validateTravelSpeed(
        context.lastRecord.gpsCoordinate,
        recordCoordinate,
      ));
    }

    return results;
  }

  /**
   * Nivel 4: Validación Fotográfica
   */
  private async performPhotoValidation(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (!data.photoMetadata) {
      results.push({
        isValid: data.createdOffline || false,
        isSuspicious: true,
        reason: FraudReason.PHOTO_MISSING_METADATA,
        message: 'No photo metadata provided',
        severity: data.createdOffline ? 5 : 25,
        details: {
          isOfflineRecord: data.createdOffline,
        },
      });
      return results;
    }

    // Crear PhotoMetadata value object con manejo de errores
    let photoMetadata: PhotoMetadata;
    try {
      photoMetadata = PhotoMetadata.create(
        new Date(data.photoMetadata.timestamp),
        data.photoMetadata.hasCameraInfo,
        data.photoMetadata.fileSize,
        data.photoMetadata.dimensions,
        data.photoMetadata.cameraInfo,
        data.photoPath,
      );
    } catch (error) {
      // Si hay error en PhotoMetadata, registrar como validación fallida pero no fallar
      results.push({
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.PHOTO_MISSING_METADATA,
        message: `Photo metadata validation failed: ${error.message}`,
        severity: 30, // Alta severidad pero no crítica
        details: {
          error: error.message,
          photoMetadata: data.photoMetadata,
        },
      });
      
      // Crear PhotoMetadata con valores seguros para continuar el procesamiento
      photoMetadata = PhotoMetadata.create(
        new Date(data.photoMetadata.timestamp),
        data.photoMetadata.hasCameraInfo,
        Math.max(data.photoMetadata.fileSize, 1),
        data.photoMetadata.dimensions ? {
          width: Math.max(data.photoMetadata.dimensions.width, 200),
          height: Math.max(data.photoMetadata.dimensions.height, 200)
        } : { width: 200, height: 200 },
        data.photoMetadata.cameraInfo,
        data.photoPath,
      );
    }

    // Validar foto completa
    const photoValidation = this.photoValidator.validatePhoto(photoMetadata, data.timestamp);
    results.push(photoValidation);

    // Validar recencia de la foto
    results.push(this.photoValidator.validatePhotoRecency(photoMetadata));

    return results;
  }

  /**
   * Nivel 5: Validación de Patrones
   */
  private async performPatternValidation(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validar dispositivo registrado
    if (context.deviceInfo) {
      if (!context.deviceInfo.isRegistered) {
        results.push({
          isValid: false,
          isSuspicious: true,
          reason: FraudReason.UNKNOWN_DEVICE,
          message: 'Device is not registered for this worker',
          severity: 20,
          details: {
            deviceId: data.deviceId,
            workerId: data.workerId,
          },
        });
      }
    }

    // Validar patrones de entrada/salida
    if (data.type === AttendanceType.ENTRY) {
      results.push(await this.validateEntryPattern(data, context));
    } else {
      results.push(await this.validateExitPattern(data, context));
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
  private async validateEntryPattern(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    // Verificar que no tenga entrada activa del día
    if (context.lastRecord && 
        context.lastRecord.type === AttendanceType.ENTRY && 
        this.isSameDay(context.lastRecord.timestamp, data.timestamp)) {
      
      return {
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.DUPLICATE_ENTRY,
        message: 'Worker already has an entry record for today',
        severity: 30,
        details: {
          lastEntryTime: context.lastRecord.timestamp.toISOString(),
          currentEntryTime: data.timestamp.toISOString(),
        },
      };
    }

    // Verificar que salió ayer (si aplica)
    if (context.lastRecord && 
        context.lastRecord.type === AttendanceType.ENTRY && 
        this.isYesterday(context.lastRecord.timestamp, data.timestamp)) {
      
      return {
        isValid: true,
        isSuspicious: true,
        reason: FraudReason.MISSING_EXIT_PREVIOUS_DAY,
        message: 'Worker did not register exit yesterday',
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
      message: 'Entry pattern validation passed',
    };
  }

  /**
   * Validar patrón de salida
   */
  private async validateExitPattern(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    // Verificar que tenga entrada del día
    if (!context.lastRecord || 
        context.lastRecord.type !== AttendanceType.ENTRY || 
        !this.isSameDay(context.lastRecord.timestamp, data.timestamp)) {
      
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.INVALID_SHIFT_SEQUENCE,
        message: 'Exit without corresponding entry for today',
        severity: 25,
        details: {
          exitTime: data.timestamp.toISOString(),
          lastRecordType: context.lastRecord?.type || 'none',
          lastRecordTime: context.lastRecord?.timestamp.toISOString() || 'none',
        },
      };
    }

    // Validar duración del turno
    const shiftHours = (data.timestamp.getTime() - context.lastRecord.timestamp.getTime()) / (1000 * 60 * 60);
    
    if (shiftHours < 1) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.UNUSUAL_WORK_HOURS,
        message: `Very short shift: ${shiftHours.toFixed(2)} hours`,
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
        message: `Very long shift: ${shiftHours.toFixed(2)} hours`,
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
      message: 'Exit pattern validation passed',
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
    const suspiciousCount = recentRecords.filter(r => r.status === RecordStatus.SUSPICIOUS).length;
    
    if (suspiciousCount > 3) {
      return {
        isValid: true,
        isSuspicious: true,
        message: `Worker has ${suspiciousCount} suspicious records in recent history`,
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
      message: 'Attendance history validation passed',
    };
  }

  /**
   * Calcular puntuación de fraude comprehensiva
   */
  private calculateComprehensiveFraudScore(
    validationResults: ComprehensiveValidationResult['validationResults'],
  ): FraudScore {
    // Excluimos validaciones fotográficas temporalmente
    const allResults = [
      ...validationResults.temporal,
      ...validationResults.cryptographic,
      ...validationResults.geolocation,
      // ...validationResults.photo, // DESHABILITADO TEMPORALMENTE
      ...validationResults.pattern,
    ];

    const violations = allResults
      .filter(result => !result.isValid || result.isSuspicious)
      .map(result => ({
        reason: result.reason || FraudReason.UNUSUAL_WORK_HOURS, // Default fallback
        severity: result.severity,
        details: result.details,
      }));

    return FraudScore.createFromViolations(violations);
  }

  /**
   * Determinar estado general
   */
  private determineOverallStatus(fraudScore: FraudScore): RecordStatus {
    if (fraudScore.isLowRisk()) {
      return RecordStatus.ACCEPTED;
    } else if (fraudScore.isMediumRisk()) {
      return RecordStatus.SUSPICIOUS;
    } else {
      return RecordStatus.REJECTED;
    }
  }

  /**
   * Generar resumen de validación
   */
  private generateValidationSummary(
    validationResults: ComprehensiveValidationResult['validationResults'],
    fraudScore: FraudScore,
  ): string {
    const categories = Object.keys(validationResults) as Array<keyof typeof validationResults>;
    const issues = categories
      .map(category => {
        const results = validationResults[category];
        const problemCount = results.filter(r => !r.isValid || r.isSuspicious).length;
        return problemCount > 0 ? `${category}: ${problemCount} issues` : null;
      })
      .filter(Boolean);

    if (issues.length === 0) {
      return 'All validations passed successfully';
    }

    const action = fraudScore.getRecommendedAction();
    return `${action}: ${issues.join(', ')} (Score: ${fraudScore.score}/100)`;
  }

  /**
   * Extraer timestamp del QR (implementación simplificada)
   */
  private extractTimestampFromQR(qrHash: string): Date | null {
    try {
      // El QR viene como JSON: {depotId, timestamp, signature}
      const qrJson = JSON.parse(qrHash);
      
      if (qrJson.timestamp) {
        const timestamp = new Date(qrJson.timestamp);
        return isNaN(timestamp.getTime()) ? null : timestamp;
      }
      
      return null;
    } catch (error) {
      console.log('[AntiFraudValidator] Error parseando QR JSON:', error);
      return null;
    }
  }

  /**
   * Extrae la firma (hash) del QR code
   */
  private extractSignatureFromQR(qrData: string): string | null {
    try {
      // El QR viene como JSON: {depotId, timestamp, signature}
      const qrJson = JSON.parse(qrData);
      return qrJson.signature || null;
    } catch (error) {
      console.log('[AntiFraudValidator] Error parseando QR JSON para extraer signature:', error);
      return null;
    }
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
