import { Injectable } from '@nestjs/common';
import { IFraudValidator, ValidatorCategory } from '../../../domain/interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext } from '../../../domain/services/anti-fraud-validator.domain-service';
import { PhotoValidatorDomainService } from '../../../domain/services/photo-validator.domain-service';
import { ValidationResult } from '../../../domain/services/temporal-validator.domain-service';
import { PhotoMetadata } from '../../../domain/value-objects/photo-metadata.vo';
import { FraudReason } from '../../../domain/enums/fraud-reason.enum';
import { VALIDATION_MESSAGES } from '../../../domain/constants/validation-messages.constants';

/**
 * Wrapper para PhotoValidatorDomainService
 * Adapta el validator legacy al nuevo patrón Strategy
 */
@Injectable()
export class PhotoValidatorWrapper implements IFraudValidator {
  readonly name = 'PhotoValidator';
  readonly category = ValidatorCategory.PHOTO;

  constructor(private readonly photoValidator: PhotoValidatorDomainService) {}

  async validate(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (!data.photoMetadata) {
      results.push({
        isValid: data.createdOffline || false,
        isSuspicious: true,
        reason: FraudReason.PHOTO_MISSING_METADATA,
        message: VALIDATION_MESSAGES.PHOTO.NO_METADATA(data.createdOffline || false),
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
        message: VALIDATION_MESSAGES.PHOTO.METADATA_INVALID(error.message),
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
        data.photoMetadata.dimensions
          ? {
              width: Math.max(data.photoMetadata.dimensions.width, 200),
              height: Math.max(data.photoMetadata.dimensions.height, 200),
            }
          : { width: 200, height: 200 },
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
}
