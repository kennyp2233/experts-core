export class GPSCoordinate {
  constructor(
    private readonly _latitude: number,
    private readonly _longitude: number,
    private readonly _accuracy: number,
    private readonly _timestamp: Date,
  ) {
    this.validateCoordinates();
  }

  static create(latitude: number, longitude: number, accuracy: number, timestamp: Date): GPSCoordinate {
    return new GPSCoordinate(latitude, longitude, accuracy, timestamp);
  }

  private validateCoordinates(): void {
    if (this._latitude < -90 || this._latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (this._longitude < -180 || this._longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }

    if (this._accuracy < 0) {
      throw new Error('GPS accuracy cannot be negative');
    }

    if (this._accuracy > 10000) {
      throw new Error('GPS accuracy is too low (>10km)');
    }
  }

  get latitude(): number {
    return this._latitude;
  }

  get longitude(): number {
    return this._longitude;
  }

  get accuracy(): number {
    return this._accuracy;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * Calculate distance to another coordinate in meters using Haversine formula
   */
  distanceTo(other: GPSCoordinate): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = this._latitude * Math.PI / 180;
    const lat2Rad = other._latitude * Math.PI / 180;
    const deltaLatRad = (other._latitude - this._latitude) * Math.PI / 180;
    const deltaLngRad = (other._longitude - this._longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Check if coordinate is within a radius from another coordinate
   */
  isWithinRadius(center: GPSCoordinate, radiusMeters: number): boolean {
    const distance = this.distanceTo(center);
    return distance <= radiusMeters;
  }

  /**
   * Calculate travel speed to another coordinate in km/h
   */
  calculateSpeedTo(other: GPSCoordinate): number {
    const distanceKm = this.distanceTo(other) / 1000;
    const timeDiffHours = Math.abs(other._timestamp.getTime() - this._timestamp.getTime()) / (1000 * 60 * 60);
    
    if (timeDiffHours === 0) return 0;
    
    return distanceKm / timeDiffHours;
  }

  /**
   * Check if GPS accuracy is sufficient for validation
   */
  isAccuratEnough(maxAccuracyMeters: number = 50): boolean {
    return this._accuracy <= maxAccuracyMeters;
  }

  equals(other: GPSCoordinate): boolean {
    return this._latitude === other._latitude &&
           this._longitude === other._longitude &&
           this._accuracy === other._accuracy;
  }

  toString(): string {
    return `GPSCoordinate(${this._latitude}, ${this._longitude}, accuracy: ${this._accuracy}m)`;
  }

  toJSON() {
    return {
      latitude: this._latitude,
      longitude: this._longitude,
      accuracy: this._accuracy,
      timestamp: this._timestamp.toISOString(),
    };
  }
}
