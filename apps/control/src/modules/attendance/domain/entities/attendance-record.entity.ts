import { AttendanceType } from '../enums/attendance-type.enum';
import { RecordStatus } from '../enums/record-status.enum';
import { GPSCoordinate } from '../value-objects/gps-coordinate.vo';
import { PhotoMetadata } from '../value-objects/photo-metadata.vo';
import { FraudScore } from '../value-objects/fraud-score.vo';

export interface AttendanceRecordProps {
  id: string;
  type: AttendanceType;
  timestamp: Date;
  status: RecordStatus;
  qrCodeUsed?: string;
  exceptionCode?: string;
  photoPath: string;
  photoMetadata: PhotoMetadata | null;
  gpsCoordinate: GPSCoordinate | null;
  validationErrors: string | null;
  fraudScore: FraudScore | null;
  processedAt: Date | null;
  createdOffline: boolean;
  syncedAt: Date | null;
  workerId: string;
  deviceId: string;
  attendanceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AttendanceRecordEntity {
  constructor(private readonly props: AttendanceRecordProps) {
    this.validateRecord();
  }

  static create(data: Omit<AttendanceRecordProps, 'id' | 'createdAt' | 'updatedAt'>): AttendanceRecordEntity {
    const now = new Date();
    return new AttendanceRecordEntity({
      ...data,
      id: '', // Will be set by repository
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: AttendanceRecordProps): AttendanceRecordEntity {
    return new AttendanceRecordEntity(data);
  }

  private validateRecord(): void {
    if (!this.props.workerId) {
      throw new Error('Worker ID is required');
    }

    if (!this.props.deviceId) {
      throw new Error('Device ID is required');
    }

    if (!this.props.attendanceId) {
      throw new Error('Attendance ID is required');
    }

    // Validar que al menos se proporcione qrCodeUsed o exceptionCode
    if (!this.props.qrCodeUsed && !this.props.exceptionCode) {
      throw new Error('Either QR code or exception code is required');
    }

    if (!this.props.photoPath) {
      throw new Error('Photo path is required');
    }

    // Validate that photo metadata exists if photo is provided
    if (this.props.photoPath && !this.props.photoMetadata) {
      // This might be acceptable for offline records that haven't been processed yet
      console.warn('Photo provided without metadata - might be offline record');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get type(): AttendanceType {
    return this.props.type;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get status(): RecordStatus {
    return this.props.status;
  }

  get qrCodeUsed(): string | undefined {
    return this.props.qrCodeUsed;
  }

  get exceptionCode(): string | undefined {
    return this.props.exceptionCode;
  }

  get photoPath(): string {
    return this.props.photoPath;
  }

  get photoMetadata(): PhotoMetadata | null {
    return this.props.photoMetadata;
  }

  get gpsCoordinate(): GPSCoordinate | null {
    return this.props.gpsCoordinate;
  }

  get validationErrors(): string | null {
    return this.props.validationErrors;
  }

  get fraudScore(): FraudScore | null {
    return this.props.fraudScore;
  }

  get processedAt(): Date | null {
    return this.props.processedAt;
  }

  get createdOffline(): boolean {
    return this.props.createdOffline;
  }

  get syncedAt(): Date | null {
    return this.props.syncedAt;
  }

  get workerId(): string {
    return this.props.workerId;
  }

  get deviceId(): string {
    return this.props.deviceId;
  }

  get attendanceId(): string {
    return this.props.attendanceId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Process the record with validation results
   */
  process(fraudScore: FraudScore, validationErrors?: string[]): AttendanceRecordEntity {
    const status = this.determineStatusFromScore(fraudScore);
    const errorString = validationErrors && validationErrors.length > 0 
      ? JSON.stringify(validationErrors) 
      : null;

    return new AttendanceRecordEntity({
      ...this.props,
      status,
      fraudScore,
      validationErrors: errorString,
      processedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private determineStatusFromScore(fraudScore: FraudScore): RecordStatus {
    if (fraudScore.isLowRisk()) {
      return RecordStatus.ACCEPTED;
    } else if (fraudScore.isMediumRisk()) {
      return RecordStatus.SUSPICIOUS;
    } else {
      return RecordStatus.REJECTED;
    }
  }

  /**
   * Mark as synced (for offline records)
   */
  markAsSynced(): AttendanceRecordEntity {
    if (!this.props.createdOffline) {
      throw new Error('Cannot mark non-offline record as synced');
    }

    return new AttendanceRecordEntity({
      ...this.props,
      syncedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update status manually (admin override)
   */
  updateStatus(newStatus: RecordStatus, adminId?: string): AttendanceRecordEntity {
    const validationErrors = this.props.validationErrors 
      ? JSON.parse(this.props.validationErrors) 
      : [];

    if (adminId) {
      validationErrors.push({
        level: 'manual',
        error: `Status changed to ${newStatus} by admin ${adminId}`,
        severity: 'info',
        timestamp: new Date().toISOString(),
      });
    }

    return new AttendanceRecordEntity({
      ...this.props,
      status: newStatus,
      validationErrors: JSON.stringify(validationErrors),
      processedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Check if record needs manual review
   */
  needsManualReview(): boolean {
    return this.props.status === RecordStatus.SUSPICIOUS || 
           (this.props.fraudScore !== null && this.props.fraudScore.needsManualReview());
  }

  /**
   * Check if record is processed
   */
  isProcessed(): boolean {
    return this.props.processedAt !== null;
  }

  /**
   * Check if record is from offline sync
   */
  isFromOfflineSync(): boolean {
    return this.props.createdOffline;
  }

  /**
   * Check if offline record is synced
   */
  isSynced(): boolean {
    return this.props.syncedAt !== null;
  }

  /**
   * Get validation errors as parsed object
   */
  getParsedValidationErrors(): any[] {
    if (!this.props.validationErrors) return [];
    
    try {
      return JSON.parse(this.props.validationErrors);
    } catch {
      return [];
    }
  }

  /**
   * Check if record has specific validation error
   */
  hasValidationError(errorType: string): boolean {
    const errors = this.getParsedValidationErrors();
    return errors.some((error: any) => error.level === errorType);
  }

  /**
   * Get age of record in minutes
   */
  getAgeInMinutes(): number {
    const now = new Date();
    return (now.getTime() - this.props.timestamp.getTime()) / (1000 * 60);
  }

  /**
   * Check if record is recent (within tolerance)
   */
  isRecent(toleranceMinutes: number = 10): boolean {
    return this.getAgeInMinutes() <= toleranceMinutes;
  }

  equals(other: AttendanceRecordEntity): boolean {
    return this.props.id === other.props.id;
  }

  toString(): string {
    return `AttendanceRecord(${this.props.id}, ${this.props.type}, ${this.props.status})`;
  }

  toJSON() {
    return {
      id: this.props.id,
      type: this.props.type,
      timestamp: this.props.timestamp.toISOString(),
      status: this.props.status,
      qrCodeUsed: this.props.qrCodeUsed,
      exceptionCode: this.props.exceptionCode,
      photoPath: this.props.photoPath,
      photoMetadata: this.props.photoMetadata?.toJSON() || null,
      gpsCoordinate: this.props.gpsCoordinate?.toJSON() || null,
      validationErrors: this.props.validationErrors,
      fraudScore: this.props.fraudScore?.toJSON() || null,
      processedAt: this.props.processedAt?.toISOString() || null,
      createdOffline: this.props.createdOffline,
      syncedAt: this.props.syncedAt?.toISOString() || null,
      workerId: this.props.workerId,
      deviceId: this.props.deviceId,
      attendanceId: this.props.attendanceId,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
