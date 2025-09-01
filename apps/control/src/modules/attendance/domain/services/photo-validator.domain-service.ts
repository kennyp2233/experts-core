import { Injectable } from '@nestjs/common';
import { FraudReason } from '../enums/fraud-reason.enum';
import { PhotoMetadata } from '../value-objects/photo-metadata.vo';
import { ValidationResult } from './temporal-validator.domain-service';

@Injectable()
export class PhotoValidatorDomainService {
  private readonly PHOTO_TIME_TOLERANCE_MINUTES = 2;
  private readonly MIN_FILE_SIZE = 50 * 1024; // 50KB
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MIN_RESOLUTION = 200; // 200x200 pixels

  /**
   * Nivel 4: Validación Fotográfica
   * Valida que la foto sea auténtica y tomada recientemente
   */
  validatePhoto(photoMetadata: PhotoMetadata, recordTime: Date): ValidationResult {
    const validationResults: ValidationResult[] = [];

    // 1. Validar metadata de cámara
    validationResults.push(this.validateCameraMetadata(photoMetadata));

    // 2. Validar timestamp de la foto
    validationResults.push(this.validatePhotoTimestamp(photoMetadata, recordTime));

    // 3. Validar características de la foto
    validationResults.push(this.validatePhotoCharacteristics(photoMetadata));

    // 4. Detectar posibles screenshots
    validationResults.push(this.detectScreenshot(photoMetadata));

    // Combinar resultados
    return this.combineValidationResults(validationResults);
  }

  /**
   * Validar que la foto tenga metadata de cámara real
   */
  private validateCameraMetadata(photoMetadata: PhotoMetadata): ValidationResult {
    if (!photoMetadata.hasCameraInfo) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.PHOTO_MISSING_METADATA,
        message: 'Photo missing camera metadata - might be screenshot',
        severity: 25,
        details: {
          hasCameraInfo: photoMetadata.hasCameraInfo,
          cameraInfo: photoMetadata.cameraInfo,
        },
      };
    }

    // Validar que la información de cámara sea completa
    const cameraInfo = photoMetadata.cameraInfo;
    if (cameraInfo && (!cameraInfo.make || !cameraInfo.model)) {
      return {
        isValid: true,
        isSuspicious: true,
        message: 'Incomplete camera metadata',
        severity: 10,
        details: {
          cameraInfo,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Camera metadata validation passed',
    };
  }

  /**
   * Validar que el timestamp de la foto coincida con el registro
   */
  private validatePhotoTimestamp(photoMetadata: PhotoMetadata, recordTime: Date): ValidationResult {
    if (!photoMetadata.validateTimestamp(recordTime, this.PHOTO_TIME_TOLERANCE_MINUTES)) {
      const diffMinutes = Math.abs(recordTime.getTime() - photoMetadata.timestamp.getTime()) / (1000 * 60);
      
      const severity = diffMinutes > 10 ? 30 : 15; // High severity for big differences
      
      return {
        isValid: false,
        isSuspicious: severity < 25,
        reason: FraudReason.PHOTO_TIMESTAMP_MISMATCH,
        message: `Photo timestamp differs by ${diffMinutes.toFixed(1)} minutes from record time`,
        severity,
        details: {
          photoTime: photoMetadata.timestamp.toISOString(),
          recordTime: recordTime.toISOString(),
          diffMinutes: diffMinutes.toFixed(1),
          tolerance: this.PHOTO_TIME_TOLERANCE_MINUTES,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Photo timestamp validation passed',
    };
  }

  /**
   * Validar características técnicas de la foto
   */
  private validatePhotoCharacteristics(photoMetadata: PhotoMetadata): ValidationResult {
    const validationIssues: string[] = [];
    let severity = 0;

    // Validar tamaño de archivo
    if (photoMetadata.fileSize < this.MIN_FILE_SIZE) {
      validationIssues.push(`File size too small: ${photoMetadata.fileSize} bytes`);
      severity += 15;
    }

    if (photoMetadata.fileSize > this.MAX_FILE_SIZE) {
      validationIssues.push(`File size too large: ${photoMetadata.fileSize} bytes`);
      severity += 10;
    }

    // Validar resolución
    const dimensions = photoMetadata.dimensions;
    if (dimensions) {
      if (dimensions.width < this.MIN_RESOLUTION || dimensions.height < this.MIN_RESOLUTION) {
        validationIssues.push(`Resolution too low: ${dimensions.width}x${dimensions.height}`);
        severity += 20;
      }

      // Check for unusual aspect ratios
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio < 0.5 || aspectRatio > 3) {
        validationIssues.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
        severity += 8;
      }
    }

    if (validationIssues.length > 0) {
      return {
        isValid: severity < 20,
        isSuspicious: true,
        message: `Photo characteristics issues: ${validationIssues.join(', ')}`,
        severity,
        details: {
          issues: validationIssues,
          fileSize: photoMetadata.fileSize,
          dimensions,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Photo characteristics validation passed',
    };
  }

  /**
   * Detectar posibles screenshots
   */
  private detectScreenshot(photoMetadata: PhotoMetadata): ValidationResult {
    if (!photoMetadata.looksLikeRealPhoto()) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.SUSPECTED_SCREENSHOT,
        message: 'Photo appears to be a screenshot',
        severity: 35,
        details: {
          hasCameraInfo: photoMetadata.hasCameraInfo,
          fileSize: photoMetadata.fileSize,
          dimensions: photoMetadata.dimensions,
        },
      };
    }

    // Calcular puntuación de sospecha adicional
    const suspicionScore = photoMetadata.calculateSuspicionScore();
    if (suspicionScore > 50) {
      return {
        isValid: true,
        isSuspicious: true,
        message: `Photo has high suspicion score: ${suspicionScore}`,
        severity: Math.floor(suspicionScore / 5), // Convert 0-100 to 0-20 severity
        details: {
          suspicionScore,
          reasons: 'High suspicion based on technical analysis',
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Screenshot detection passed',
    };
  }

  /**
   * Validar que la foto fue tomada recientemente
   */
  validatePhotoRecency(photoMetadata: PhotoMetadata, toleranceMinutes: number = 5): ValidationResult {
    const now = new Date();
    if (!photoMetadata.isTakenRecently(now, toleranceMinutes)) {
      const ageMinutes = (now.getTime() - photoMetadata.timestamp.getTime()) / (1000 * 60);
      
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.PHOTO_NOT_RECENT,
        message: `Photo is not recent: taken ${ageMinutes.toFixed(1)} minutes ago`,
        severity: 20,
        details: {
          photoAge: ageMinutes.toFixed(1),
          tolerance: toleranceMinutes,
          photoTime: photoMetadata.timestamp.toISOString(),
          currentTime: now.toISOString(),
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Photo recency validation passed',
    };
  }

  /**
   * Combinar múltiples resultados de validación
   */
  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    const invalidResults = results.filter(r => !r.isValid);
    const suspiciousResults = results.filter(r => r.isSuspicious);
    
    // Si hay resultados inválidos, retornar el más severo
    if (invalidResults.length > 0) {
      const mostSevere = invalidResults.reduce((max, current) => 
        current.severity > max.severity ? current : max
      );
      
      return {
        ...mostSevere,
        details: {
          ...mostSevere.details,
          allResults: results.map(r => ({
            valid: r.isValid,
            suspicious: r.isSuspicious,
            message: r.message,
            severity: r.severity,
          })),
        },
      };
    }

    // Si hay resultados sospechosos, combinar severidades
    if (suspiciousResults.length > 0) {
      const totalSeverity = suspiciousResults.reduce((sum, r) => sum + r.severity, 0);
      const messages = suspiciousResults.map(r => r.message).join('; ');
      
      return {
        isValid: true,
        isSuspicious: true,
        message: `Multiple photo issues: ${messages}`,
        severity: Math.min(totalSeverity, 40), // Cap at 40
        details: {
          suspiciousCount: suspiciousResults.length,
          totalSeverity,
          allResults: results.map(r => ({
            valid: r.isValid,
            suspicious: r.isSuspicious,
            message: r.message,
            severity: r.severity,
          })),
        },
      };
    }

    // Todo válido
    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'All photo validations passed',
      details: {
        validationCount: results.length,
      },
    };
  }

  /**
   * Crear PhotoMetadata desde datos raw
   */
  createPhotoMetadata(
    timestamp: Date,
    hasCameraInfo: boolean,
    fileSize: number,
    dimensions?: { width: number; height: number },
    cameraInfo?: any,
    originalPath?: string,
  ): PhotoMetadata {
    return PhotoMetadata.create(
      timestamp,
      hasCameraInfo,
      fileSize,
      dimensions,
      cameraInfo,
      originalPath,
    );
  }
}
