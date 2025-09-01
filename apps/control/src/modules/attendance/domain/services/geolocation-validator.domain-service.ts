import { Injectable } from '@nestjs/common';
import { FraudReason } from '../enums/fraud-reason.enum';
import { GPSCoordinate } from '../value-objects/gps-coordinate.vo';
import { ValidationResult } from './temporal-validator.domain-service';

export interface DepotLocation {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

@Injectable()
export class GeolocationValidatorDomainService {
  private readonly MIN_GPS_ACCURACY = 50; // meters
  private readonly MAX_TRAVEL_SPEED_KMH = 100; // km/h
  private readonly SUSPICIOUS_SPEED_KMH = 60; // km/h

  /**
   * Nivel 3: Validación Geográfica
   * Valida que la ubicación esté dentro del geofence del depot
   */
  validateLocation(
    recordCoordinate: GPSCoordinate,
    depotLocation: DepotLocation,
  ): ValidationResult {
    // First check GPS accuracy
    if (!recordCoordinate.isAccuratEnough(this.MIN_GPS_ACCURACY)) {
      return {
        isValid: false,
        isSuspicious: true,
        reason: FraudReason.GPS_ACCURACY_TOO_LOW,
        message: `GPS accuracy too low: ${recordCoordinate.accuracy}m (required: <${this.MIN_GPS_ACCURACY}m)`,
        severity: 20,
        details: {
          accuracy: recordCoordinate.accuracy,
          requiredAccuracy: this.MIN_GPS_ACCURACY,
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

    // Check if within depot radius
    const distance = recordCoordinate.distanceTo(depotCoordinate);
    
    if (distance > depotLocation.radius) {
      const severity = this.calculateLocationSeverity(distance, depotLocation.radius);
      
      return {
        isValid: false,
        isSuspicious: severity < 25, // High severity = rejected, lower = suspicious
        reason: FraudReason.LOCATION_OUT_OF_RANGE,
        message: `Location ${distance.toFixed(0)}m from depot (max: ${depotLocation.radius}m)`,
        severity,
        details: {
          distance: distance.toFixed(2),
          maxDistance: depotLocation.radius,
          recordCoordinate: recordCoordinate.toJSON(),
          depotLocation,
          exceedsBy: (distance - depotLocation.radius).toFixed(2),
        },
      };
    }

    // Check if suspiciously close to center (might indicate spoofing)
    if (distance < 5) {
      return {
        isValid: true,
        isSuspicious: true,
        message: `Location suspiciously close to depot center (${distance.toFixed(1)}m)`,
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
      message: 'Location validation passed',
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
        message: 'First location record for worker',
      };
    }

    const speedKmh = previousCoordinate.calculateSpeedTo(currentCoordinate);
    
    // Check for impossible travel speed
    if (speedKmh > this.MAX_TRAVEL_SPEED_KMH) {
      return {
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.IMPOSSIBLE_TRAVEL_SPEED,
        message: `Impossible travel speed: ${speedKmh.toFixed(1)} km/h (max: ${this.MAX_TRAVEL_SPEED_KMH} km/h)`,
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
        message: `High travel speed: ${speedKmh.toFixed(1)} km/h`,
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
      message: 'Travel speed validation passed',
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
        message: 'Coordinates at null island (0,0) - likely GPS error or spoofing',
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
        message: 'Coordinates have very low precision - might be manually entered',
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
        message: 'Coordinates outside valid geographic bounds',
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
      message: 'Coordinate realism validation passed',
    };
  }

  private calculateLocationSeverity(distance: number, maxRadius: number): number {
    const exceedsBy = distance - maxRadius;
    const exceedsRatio = exceedsBy / maxRadius;
    
    // Base severity starts at 15
    let severity = 15;
    
    // Add points based on how far outside the radius
    if (exceedsRatio > 2) { // More than 2x outside radius
      severity += 25;
    } else if (exceedsRatio > 1) { // More than 1x outside radius
      severity += 15;
    } else if (exceedsRatio > 0.5) { // More than 50% outside radius
      severity += 10;
    } else {
      severity += 5;
    }
    
    return Math.min(severity, 40); // Cap at 40
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
}
