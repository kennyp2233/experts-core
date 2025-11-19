import { Injectable } from '@nestjs/common';
import { IFraudValidator, ValidatorCategory } from '../../../domain/interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext } from '../../../domain/services/anti-fraud-validator.domain-service';
import { GeolocationValidatorDomainService } from '../../../domain/services/geolocation-validator.domain-service';
import { ValidationResult } from '../../../domain/services/temporal-validator.domain-service';
import { GPSCoordinate } from '../../../domain/value-objects/gps-coordinate.vo';

/**
 * Wrapper para GeolocationValidatorDomainService
 * Adapta el validator legacy al nuevo patrón Strategy
 */
@Injectable()
export class GeolocationValidatorWrapper implements IFraudValidator {
  readonly name = 'GeolocationValidator';
  readonly category = ValidatorCategory.GEOLOCATION;

  constructor(private readonly geolocationValidator: GeolocationValidatorDomainService) {}

  async validate(
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
      results.push(
        this.geolocationValidator.validateTravelSpeed(
          context.lastRecord.gpsCoordinate,
          recordCoordinate,
        ),
      );
    }

    return results;
  }
}
