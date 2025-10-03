import { AttendanceEntity } from '../entities/attendance.entity';
import { AttendanceRecordEntity } from '../entities/attendance-record.entity';
import { AttendanceType } from '../enums/attendance-type.enum';
import { RecordStatus } from '../enums/record-status.enum';

export interface CreateAttendanceData {
  date: Date;
  entryTime?: Date;
  exitTime?: Date;
  notes?: string;
  workerId: string;
  depotId: string;
}

export interface CreateAttendanceRecordData {
  type: AttendanceType;
  timestamp: Date;
  status: RecordStatus;
  qrCodeUsed?: string;
  exceptionCode?: string;
  photoPath: string;
  photoMetadata?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  validationErrors?: string | null;
  fraudScore?: number | null;
  processedAt?: Date | null;
  createdOffline: boolean;
  syncedAt?: Date | null;
  workerId: string;
  deviceId: string;
  attendanceId: string;
}

export interface UpdateAttendanceData {
  entryTime?: Date;
  exitTime?: Date;
  totalHours?: number;
  isComplete?: boolean;
  notes?: string;
}

export interface UpdateAttendanceRecordData {
  status?: RecordStatus;
  validationErrors?: string;
  processedAt?: Date;
  syncedAt?: Date;
}

export interface AttendanceFilter {
  workerId?: string;
  depotId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isComplete?: boolean;
  isActive?: boolean;
}

export interface AttendanceRecordFilter {
  workerId?: string;
  deviceId?: string;
  attendanceId?: string;
  status?: RecordStatus;
  type?: AttendanceType;
  createdOffline?: boolean;
  needsManualReview?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AttendanceWithRecords extends AttendanceEntity {
  records: AttendanceRecordEntity[];
}

export abstract class AttendanceRepositoryInterface {
  // Attendance CRUD
  abstract createAttendance(data: CreateAttendanceData): Promise<AttendanceEntity>;
  abstract findAttendanceById(id: string): Promise<AttendanceEntity | null>;
  abstract findAttendanceByWorkerAndDate(workerId: string, date: Date): Promise<AttendanceEntity | null>;
  abstract updateAttendance(id: string, data: UpdateAttendanceData): Promise<AttendanceEntity>;
  abstract deleteAttendance(id: string): Promise<void>;

  // Attendance queries
  abstract findAttendances(filter: AttendanceFilter, limit?: number, offset?: number): Promise<AttendanceEntity[]>;
  abstract findAttendanceWithRecords(id: string): Promise<AttendanceWithRecords | null>;
  abstract findIncompleteAttendances(dateFrom?: Date, dateTo?: Date): Promise<AttendanceEntity[]>;
  abstract findActiveAttendanceByWorker(workerId: string): Promise<AttendanceEntity | null>;
  abstract findWorkerAttendanceHistory(workerId: string, limit?: number, offset?: number): Promise<AttendanceEntity[]>;

  // Attendance Record CRUD
  abstract createAttendanceRecord(data: CreateAttendanceRecordData): Promise<AttendanceRecordEntity>;
  abstract findAttendanceRecordById(id: string): Promise<AttendanceRecordEntity | null>;
  abstract updateAttendanceRecord(id: string, data: UpdateAttendanceRecordData): Promise<AttendanceRecordEntity>;
  abstract deleteAttendanceRecord(id: string): Promise<void>;

  // Attendance Record queries
  abstract findAttendanceRecords(filter: AttendanceRecordFilter, limit?: number, offset?: number): Promise<AttendanceRecordEntity[]>;
  abstract findRecordsByAttendance(attendanceId: string): Promise<AttendanceRecordEntity[]>;
  abstract findPendingValidationRecords(limit?: number): Promise<AttendanceRecordEntity[]>;
  abstract findSuspiciousRecords(dateFrom?: Date, dateTo?: Date): Promise<AttendanceRecordEntity[]>;
  abstract findOfflineRecords(workerId?: string, synced?: boolean): Promise<AttendanceRecordEntity[]>;
  abstract findLastRecordByWorker(workerId: string, beforeTime?: Date): Promise<AttendanceRecordEntity | null>;

  // Statistics and analytics
  abstract getWorkerAttendanceStats(workerId: string, dateFrom: Date, dateTo: Date): Promise<{
    totalDays: number;
    completeDays: number;
    incompleteDays: number;
    totalHours: number;
    averageHoursPerDay: number;
    earliestEntry: Date | null;
    latestExit: Date | null;
  }>;

  abstract getDepotAttendanceStats(depotId: string, date: Date): Promise<{
    totalWorkers: number;
    presentWorkers: number;
    activeWorkers: number;
    completedShifts: number;
    totalHours: number;
  }>;

  abstract getFraudStats(dateFrom: Date, dateTo: Date): Promise<{
    totalRecords: number;
    acceptedRecords: number;
    suspiciousRecords: number;
    rejectedRecords: number;
    averageFraudScore: number;
    topFraudReasons: Array<{ reason: string; count: number }>;
  }>;

  // Bulk operations
  abstract createMultipleRecords(records: CreateAttendanceRecordData[]): Promise<AttendanceRecordEntity[]>;
  abstract updateMultipleRecords(updates: Array<{ id: string; data: UpdateAttendanceRecordData }>): Promise<AttendanceRecordEntity[]>;

  // Cleanup and maintenance
  abstract cleanupOldRecords(olderThanDays: number): Promise<number>;
  abstract recalculateAttendanceHours(attendanceId: string): Promise<AttendanceEntity>;
  abstract recalculateAllHours(dateFrom: Date, dateTo: Date): Promise<number>;
}
