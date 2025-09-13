import { Injectable } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { AntiFraudValidatorDomainService } from '../../domain/services/anti-fraud-validator.domain-service';
import { ValidationResultDto } from '../dto/validation-result.dto';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordStatus } from '../../domain/enums/record-status.enum';
import { GPSCoordinate } from '../../domain/value-objects/gps-coordinate.vo';
import { PhotoMetadata } from '../../domain/value-objects/photo-metadata.vo';

export interface ValidateAttendanceDto {
  workerId: string;
  type: AttendanceType;
  timestamp: string;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  photoMetadata?: {
    fileName: string;
    size: number;
    mimeType: string;
    quality: number;
    width: number;
    height: number;
    faceDetected: boolean;
    hasLocationMetadata: boolean;
    createdAt: string;
  };
  deviceInfo: {
    deviceId: string;
    deviceModel: string;
    osVersion: string;
    appVersion: string;
    batteryLevel: number;
    isCharging: boolean;
    hasVpn: boolean;
    hasProxy: boolean;
    isEmulator: boolean;
    isRooted: boolean;
    networkType: string;
  };
  encryptedPayload: string;
}

@Injectable()
export class ValidateAttendanceUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly antiFraudValidator: AntiFraudValidatorDomainService,
  ) {}

  async execute(dto: ValidateAttendanceDto): Promise<ValidationResultDto> {
    try {
      // Construir contexto de validación
      const { validationData, validationContext } = await this.buildValidationContext(dto);

      // Ejecutar validación anti-fraude
      const validationResult = await this.antiFraudValidator.validateRecord(validationData, validationContext);

      // Construir ValidationResultDto según la estructura requerida
      const validationErrors = this.extractValidationErrors(validationResult);
      
      return {
        recordId: `validation-${Date.now()}`, // ID para validación
        status: this.mapRecordStatusToString(validationResult.overallStatus),
        fraudScore: validationResult.fraudScore.score,
        validationErrors,
        processedAt: new Date().toISOString(),
        needsManualReview: validationResult.needsManualReview,
        recommendedAction: validationResult.recommendedAction,
        summary: validationResult.summary,
        validationDetails: {
          temporal: this.countValidationResults(validationResult.validationResults.temporal),
          cryptographic: this.countValidationResults(validationResult.validationResults.cryptographic),
          geolocation: this.countValidationResults(validationResult.validationResults.geolocation),
          photo: this.countValidationResults(validationResult.validationResults.photo),
          pattern: this.countValidationResults(validationResult.validationResults.pattern),
        },
      };

    } catch (error) {
      return {
        recordId: `error-${Date.now()}`,
        status: 'REJECTED',
        fraudScore: 100, // Máximo score por error
        validationErrors: [{
          level: 'system',
          error: error instanceof Error ? error.message : 'Error de validación desconocido',
          severity: 'critical',
        }],
        processedAt: new Date().toISOString(),
        needsManualReview: true,
        recommendedAction: 'REJECT',
        summary: 'System error occurred during validation',
        validationDetails: {
          temporal: { passed: 0, failed: 1, suspicious: 0 },
          cryptographic: { passed: 0, failed: 1, suspicious: 0 },
          geolocation: { passed: 0, failed: 1, suspicious: 0 },
          photo: { passed: 0, failed: 1, suspicious: 0 },
          pattern: { passed: 0, failed: 1, suspicious: 0 },
        },
      };
    }
  }

  private async buildValidationContext(dto: ValidateAttendanceDto) {
    // Construir GPS coordinates
    const gpsCoordinates = GPSCoordinate.create(
      dto.gpsCoordinates.latitude,
      dto.gpsCoordinates.longitude,
      dto.gpsCoordinates.accuracy,
      new Date(dto.timestamp),
    );

    // Construir photo metadata si existe
    let photoMetadata;
    if (dto.photoMetadata) {
      photoMetadata = PhotoMetadata.create(
        new Date(dto.photoMetadata.createdAt),
        dto.photoMetadata.hasLocationMetadata,
        dto.photoMetadata.size,
        {
          width: dto.photoMetadata.width,
          height: dto.photoMetadata.height,
        },
      );
    }

    // Obtener historial del worker (usando método disponible)
    const recentRecords = await this.attendanceRepository.findAttendanceRecords(
      { workerId: dto.workerId },
      30 // últimos 30 registros
    );

    // Construir validation data para el anti-fraud validator
    const validationData = {
      type: dto.type,
      timestamp: new Date(dto.timestamp),
      qrCodeUsed: 'qr_from_payload', // Extraer del encryptedPayload si es necesario
      photoPath: dto.photoMetadata?.fileName || '',
      photoMetadata: dto.photoMetadata ? {
        timestamp: dto.photoMetadata.createdAt,
        hasCameraInfo: dto.photoMetadata.hasLocationMetadata,
        fileSize: dto.photoMetadata.size,
        dimensions: {
          width: dto.photoMetadata.width,
          height: dto.photoMetadata.height,
        },
      } : undefined,
      location: {
        latitude: dto.gpsCoordinates.latitude,
        longitude: dto.gpsCoordinates.longitude,
        accuracy: dto.gpsCoordinates.accuracy,
        timestamp: dto.timestamp,
      },
      deviceId: dto.deviceInfo.deviceId,
      workerId: dto.workerId,
      createdOffline: false, // Por defecto para validación
    };

    // Construir validation context
    const validationContext = {
      depot: {
        id: process.env.DEFAULT_DEPOT_ID || 'main-depot',
        name: 'Main Depot',
        latitude: parseFloat(process.env.DEFAULT_DEPOT_LAT || '-12.0464'),
        longitude: parseFloat(process.env.DEFAULT_DEPOT_LNG || '-77.0428'),
        radius: parseInt(process.env.DEFAULT_DEPOT_RADIUS || '100'),
        secret: process.env.DEPOT_SECRET_KEY || 'default-depot-secret',
      },
      lastRecord: recentRecords.length > 0 ? recentRecords[0] : undefined,
      workerAttendanceHistory: recentRecords,
      deviceInfo: {
        isRegistered: true, // Por defecto asumimos que está registrado
        lastSeenAt: new Date(),
      },
    };

    return { validationData, validationContext };
  }

  private extractValidationErrors(validationResult: any): Array<{level: string; error: string; severity: string; details?: any}> {
    const errors: Array<{level: string; error: string; severity: string; details?: any}> = [];
    
    // Extraer errores de cada nivel de validación
    const levels = ['temporal', 'cryptographic', 'geolocation', 'photo', 'pattern'];
    
    levels.forEach(level => {
      const results = validationResult.validationResults[level] || [];
      results.forEach((result: any) => {
        if (!result.isValid) {
          errors.push({
            level,
            error: result.error || `${level} validation failed`,
            severity: result.severity || 'warning',
            details: result.details,
          });
        }
      });
    });

    return errors;
  }

  private mapRecordStatusToString(status: RecordStatus): string {
    return status.toString();
  }

  private countValidationResults(results: any[]) {
    return {
      passed: results.filter(r => r.isValid).length,
      failed: results.filter(r => !r.isValid && r.severity === 'error').length,
      suspicious: results.filter(r => !r.isValid && r.severity !== 'error').length,
    };
  }
}
