import { Injectable } from '@nestjs/common';
import { FraudReason } from '../enums/fraud-reason.enum';
import { GPSCoordinate } from '../value-objects/gps-coordinate.vo';
import { ValidationResult } from './temporal-validator.domain-service';
import { IFraudValidator, ValidatorCategory } from '../interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext } from './anti-fraud-validator.domain-service';

export interface DepotLocation {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

@Injectable()
export class GeolocationValidatorDomainService implements IFraudValidator {
  readonly name = 'GeolocationValidator';
  readonly category = ValidatorCategory.GEOLOCATION;
  // Umbrales más realistas para GPS móvil
  private readonly EXCELLENT_GPS_ACCURACY = 20; // meters - GPS excelente
  private readonly GOOD_GPS_ACCURACY = 50; // meters - GPS bueno
  private readonly ACCEPTABLE_GPS_ACCURACY = 150; // meters - GPS aceptable
  private readonly POOR_GPS_ACCURACY = 300; // meters - GPS pobre pero usable

  private readonly MAX_TRAVEL_SPEED_KMH = 120; // km/h - más realista para vehículos
  private readonly SUSPICIOUS_SPEED_KMH = 80; // km/h - velocidad sospechosa

  /**
   * Nivel 3: Validación Geográfica
   * Valida que la ubicación esté dentro del geofence del depot
   */
  validateLocation(
    recordCoordinate: GPSCoordinate,
    depotLocation: DepotLocation,
  ): ValidationResult {
    // Validar precisión GPS con umbrales graduales
    const accuracyValidation = this.validateGPSAccuracy(recordCoordinate);

    // Si la precisión es muy mala (>300m), fallar la validación
    if (recordCoordinate.accuracy > this.POOR_GPS_ACCURACY) {
      return {
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.GPS_ACCURACY_TOO_LOW,
        message: `Precisión GPS muy baja: ${recordCoordinate.accuracy}m (máximo aceptable: ${this.POOR_GPS_ACCURACY}m)`,
        severity: 30,
        details: {
          accuracy: recordCoordinate.accuracy,
          maxAcceptable: this.POOR_GPS_ACCURACY,
          coordinate: recordCoordinate.toJSON(),
        },
      };
    }

    // Create depot coordinate
    const depotCoordinate = GPSCoordinate.create(
      depotLocation.latitude,
      depotLocation.longitude,
      0, // Depot has perfect accuracy
      new Date(), // Timestamp doesn't matter for distance calculation
    );

    // Check if within depot radius, ajustando por precisión GPS
    const distance = recordCoordinate.distanceTo(depotCoordinate);

    // Tolerancia adicional basada en precisión GPS
    const gpsToleranceBuffer = Math.min(recordCoordinate.accuracy * 0.5, 100);
    const effectiveRadius = depotLocation.radius + gpsToleranceBuffer;

    if (distance > effectiveRadius) {
      const severity = this.calculateLocationSeverity(distance, effectiveRadius, recordCoordinate.accuracy);

      return {
        isValid: false,
        isSuspicious: severity < 25, // High severity = rejected, lower = suspicious
        reason: FraudReason.LOCATION_OUT_OF_RANGE,
        message: `Ubicación a ${distance.toFixed(0)}m del depósito (máximo: ${depotLocation.radius}m + ${gpsToleranceBuffer.toFixed(0)}m tolerancia GPS)`,
        severity,
        details: {
          distance: distance.toFixed(2),
          baseRadius: depotLocation.radius,
          gpsToleranceBuffer: gpsToleranceBuffer.toFixed(2),
          effectiveRadius: effectiveRadius.toFixed(2),
          recordCoordinate: recordCoordinate.toJSON(),
          depotLocation,
          exceedsBy: (distance - effectiveRadius).toFixed(2),
        },
      };
    }

    // Check if suspiciously close to center (might indicate spoofing)
    if (distance < 5) {
      return {
        isValid: true,
        isSuspicious: true,
        message: `Ubicación sospechosamente cerca del centro del depósito (${distance.toFixed(1)}m)`,
        severity: 5,
        details: {
          distance: distance.toFixed(2),
          depotLocation,
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Validación de ubicación exitosa',
      details: {
        distance: distance.toFixed(2),
        maxDistance: depotLocation.radius,
      },
    };
  }

  /**
   * Validar velocidad de viaje entre registros
   */
  validateTravelSpeed(
    previousCoordinate: GPSCoordinate | null,
    currentCoordinate: GPSCoordinate,
  ): ValidationResult {
    if (!previousCoordinate) {
      return {
        isValid: true,
        isSuspicious: false,
        severity: 0,
        message: 'Primer registro de ubicación del trabajador',
      };
    }

    const speedKmh = previousCoordinate.calculateSpeedTo(currentCoordinate);
    
    // Check for impossible travel speed
    if (speedKmh > this.MAX_TRAVEL_SPEED_KMH) {
      return {
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.IMPOSSIBLE_TRAVEL_SPEED,
        message: `Velocidad de viaje imposible: ${speedKmh.toFixed(1)} km/h (máximo: ${this.MAX_TRAVEL_SPEED_KMH} km/h)`,
        severity: 35,
        details: {
          speedKmh: speedKmh.toFixed(2),
          maxSpeed: this.MAX_TRAVEL_SPEED_KMH,
          distance: previousCoordinate.distanceTo(currentCoordinate).toFixed(2),
          timeDiff: Math.abs(currentCoordinate.timestamp.getTime() - previousCoordinate.timestamp.getTime()) / (1000 * 60), // minutes
          previousLocation: previousCoordinate.toJSON(),
          currentLocation: currentCoordinate.toJSON(),
        },
      };
    }

    // Check for suspicious travel speed
    if (speedKmh > this.SUSPICIOUS_SPEED_KMH) {
      return {
        isValid: true,
        isSuspicious: true,
        message: `Velocidad de viaje alta: ${speedKmh.toFixed(1)} km/h`,
        severity: 10,
        details: {
          speedKmh: speedKmh.toFixed(2),
          suspiciousThreshold: this.SUSPICIOUS_SPEED_KMH,
          distance: previousCoordinate.distanceTo(currentCoordinate).toFixed(2),
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Validación de velocidad de viaje exitosa',
      details: {
        speedKmh: speedKmh.toFixed(2),
      },
    };
  }

  /**
   * Validar que la coordenada no sea obviamente falsa
   */
  validateCoordinateRealism(coordinate: GPSCoordinate): ValidationResult {
    // Check for null island (0,0) - common GPS error or spoofing
    if (Math.abs(coordinate.latitude) < 0.001 && Math.abs(coordinate.longitude) < 0.001) {
      return {
        isValid: false,
        isSuspicious: false,
        message: 'Coordenadas en la isla nula (0,0) - probablemente error de GPS o falsificación',
        severity: 40,
        details: {
          coordinate: coordinate.toJSON(),
        },
      };
    }

    // Check for coordinates that are exactly round numbers (suspicious)
    const latDecimalPlaces = this.getDecimalPlaces(coordinate.latitude);
    const lngDecimalPlaces = this.getDecimalPlaces(coordinate.longitude);
    
    if (latDecimalPlaces <= 2 && lngDecimalPlaces <= 2) {
      return {
        isValid: true,
        isSuspicious: true,
        message: 'Las coordenadas tienen muy baja precisión - podrían haber sido ingresadas manualmente',
        severity: 12,
        details: {
          coordinate: coordinate.toJSON(),
          latDecimalPlaces,
          lngDecimalPlaces,
        },
      };
    }

    // Check for coordinates outside reasonable bounds for the project
    // This would be customized based on the geographic area of operation
    if (Math.abs(coordinate.latitude) > 85 || Math.abs(coordinate.longitude) > 180) {
      return {
        isValid: false,
        isSuspicious: false,
        message: 'Coordenadas fuera de los límites geográficos válidos',
        severity: 30,
        details: {
          coordinate: coordinate.toJSON(),
        },
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: 'Validación de realismo de coordenadas exitosa',
    };
  }

  /**
   * Validar precisión GPS con umbrales graduales
   */
  private validateGPSAccuracy(coordinate: GPSCoordinate): ValidationResult {
    const accuracy = coordinate.accuracy;

    if (accuracy <= this.EXCELLENT_GPS_ACCURACY) {
      return {
        isValid: true,
        isSuspicious: false,
        severity: 0,
        message: 'Precisión GPS excelente',
        details: { accuracy, level: 'excellent' }
      };
    }

    if (accuracy <= this.GOOD_GPS_ACCURACY) {
      return {
        isValid: true,
        isSuspicious: false,
        severity: 2,
        message: 'Precisión GPS buena',
        details: { accuracy, level: 'good' }
      };
    }

    if (accuracy <= this.ACCEPTABLE_GPS_ACCURACY) {
      return {
        isValid: true,
        isSuspicious: true,
        severity: 8,
        message: 'Precisión GPS aceptable',
        details: { accuracy, level: 'acceptable' }
      };
    }

    // Entre ACCEPTABLE y POOR - aún válido pero con mayor severidad
    return {
      isValid: true,
      isSuspicious: true,
      severity: 15,
      message: 'Precisión GPS pobre pero usable',
      details: { accuracy, level: 'poor' }
    };
  }

  private calculateLocationSeverity(distance: number, effectiveRadius: number, gpsAccuracy: number): number {
    const exceedsBy = distance - effectiveRadius;
    const exceedsRatio = exceedsBy / effectiveRadius;

    // Base severity ajustada por precisión GPS
    let severity = 10;

    // Agregar penalización por GPS impreciso
    if (gpsAccuracy > this.ACCEPTABLE_GPS_ACCURACY) {
      severity += 5;
    }

    // Add points based on how far outside the radius
    if (exceedsRatio > 3) { // More than 3x outside effective radius
      severity += 30;
    } else if (exceedsRatio > 2) { // More than 2x outside effective radius
      severity += 20;
    } else if (exceedsRatio > 1) { // More than 1x outside effective radius
      severity += 15;
    } else if (exceedsRatio > 0.5) { // More than 50% outside effective radius
      severity += 10;
    } else {
      severity += 5;
    }

    return Math.min(severity, 45); // Cap at 45
  }

  private getDecimalPlaces(value: number): number {
    const str = value.toString();
    const decimalIndex = str.indexOf('.');
    return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
  }

  /**
   * Obtener coordenada desde parámetros de ubicación
   */
  createCoordinateFromLocation(latitude: number, longitude: number, accuracy: number, timestamp: Date): GPSCoordinate {
    return GPSCoordinate.create(latitude, longitude, accuracy, timestamp);
  }

  /**
   * Calcular distancia entre dos ubicaciones
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const coord1 = GPSCoordinate.create(lat1, lng1, 0, new Date());
    const coord2 = GPSCoordinate.create(lat2, lng2, 0, new Date());
    return coord1.distanceTo(coord2);
  }

  /**
   * Implementación de IFraudValidator
   * Ejecuta todas las validaciones geográficas
   */
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
    results.push(this.validateCoordinateRealism(recordCoordinate));

    // Validar ubicación dentro del geofence
    results.push(this.validateLocation(recordCoordinate, context.depot));

    // Validar velocidad de viaje
    if (context.lastRecord && context.lastRecord.gpsCoordinate) {
      results.push(
        this.validateTravelSpeed(
          context.lastRecord.gpsCoordinate,
          recordCoordinate,
        ),
      );
    }

    return results;
  }
}
