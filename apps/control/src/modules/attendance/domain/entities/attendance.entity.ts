import { WorkShift } from '../value-objects/work-shift.vo';
import { AttendanceRecordEntity } from './attendance-record.entity';

export interface AttendanceProps {
  id: string;
  date: Date;
  entryTime: Date | null;
  exitTime: Date | null;
  totalHours: number | null;
  isComplete: boolean;
  notes: string | null;
  workerId: string;
  depotId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AttendanceEntity {
  constructor(private readonly props: AttendanceProps) {
    this.validateAttendance();
  }

  static create(data: Omit<AttendanceProps, 'id' | 'totalHours' | 'isComplete' | 'createdAt' | 'updatedAt'>): AttendanceEntity {
    const now = new Date();
    const totalHours = AttendanceEntity.calculateTotalHours(data.entryTime, data.exitTime);
    const isComplete = data.entryTime !== null && data.exitTime !== null;

    return new AttendanceEntity({
      ...data,
      id: '', // Will be set by repository
      totalHours,
      isComplete,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: AttendanceProps): AttendanceEntity {
    return new AttendanceEntity(data);
  }

  private validateAttendance(): void {
    if (!this.props.workerId) {
      throw new Error('Worker ID is required');
    }

    if (!this.props.depotId) {
      throw new Error('Depot ID is required');
    }

    // Normalize date to start of day for consistency
    const normalizedDate = new Date(this.props.date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    if (this.props.date.getTime() !== normalizedDate.getTime()) {
      // Allow this but warn - repository should handle normalization
      console.warn('Attendance date should be normalized to start of day');
    }

    // Validate time logic
    if (this.props.entryTime && this.props.exitTime) {
      const calculatedHours = AttendanceEntity.calculateTotalHours(this.props.entryTime, this.props.exitTime);
      if (calculatedHours !== null && calculatedHours > 24) {
        throw new Error('Total work hours cannot exceed 24 hours');
      }
    }
  }

  private static calculateTotalHours(entryTime: Date | null, exitTime: Date | null): number | null {
    if (!entryTime || !exitTime) {
      return null;
    }

    let diffMs = exitTime.getTime() - entryTime.getTime();
    
    // Handle overnight shifts
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
    }

    return diffMs / (1000 * 60 * 60); // Convert to hours
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get date(): Date {
    return this.props.date;
  }

  get entryTime(): Date | null {
    return this.props.entryTime;
  }

  get exitTime(): Date | null {
    return this.props.exitTime;
  }

  get totalHours(): number | null {
    return this.props.totalHours;
  }

  get isComplete(): boolean {
    return this.props.isComplete;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get workerId(): string {
    return this.props.workerId;
  }

  get depotId(): string {
    return this.props.depotId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Add entry time to attendance
   */
  addEntry(entryTime: Date): AttendanceEntity {
    if (this.props.entryTime) {
      throw new Error('Attendance already has an entry time');
    }

    const totalHours = AttendanceEntity.calculateTotalHours(entryTime, this.props.exitTime);
    const isComplete = entryTime !== null && this.props.exitTime !== null;

    return new AttendanceEntity({
      ...this.props,
      entryTime,
      totalHours,
      isComplete,
      updatedAt: new Date(),
    });
  }

  /**
   * Add exit time to attendance
   */
  addExit(exitTime: Date): AttendanceEntity {
    if (!this.props.entryTime) {
      throw new Error('Cannot add exit time without entry time');
    }

    if (this.props.exitTime) {
      throw new Error('Attendance already has an exit time');
    }

    const totalHours = AttendanceEntity.calculateTotalHours(this.props.entryTime, exitTime);
    const isComplete = true;

    return new AttendanceEntity({
      ...this.props,
      exitTime,
      totalHours,
      isComplete,
      updatedAt: new Date(),
    });
  }

  /**
   * Update notes
   */
  updateNotes(notes: string): AttendanceEntity {
    return new AttendanceEntity({
      ...this.props,
      notes,
      updatedAt: new Date(),
    });
  }

  /**
   * Recalculate total hours (in case of corrections)
   */
  recalculateHours(): AttendanceEntity {
    const totalHours = AttendanceEntity.calculateTotalHours(this.props.entryTime, this.props.exitTime);
    const isComplete = this.props.entryTime !== null && this.props.exitTime !== null;

    return new AttendanceEntity({
      ...this.props,
      totalHours,
      isComplete,
      updatedAt: new Date(),
    });
  }

  /**
   * Get as WorkShift value object
   */
  toWorkShift(): WorkShift {
    return WorkShift.create(this.props.date, this.props.entryTime, this.props.exitTime);
  }

  /**
   * Check if attendance is currently active (has entry but no exit)
   */
  isActive(): boolean {
    return this.props.entryTime !== null && this.props.exitTime === null;
  }

  /**
   * Check if attendance is incomplete
   */
  isIncomplete(): boolean {
    return !this.props.isComplete;
  }

  /**
   * Check if it's a long shift (over specified hours)
   */
  isLongShift(maxHours: number = 8): boolean {
    return this.props.totalHours !== null && this.props.totalHours > maxHours;
  }

  /**
   * Check if it's a short shift (under specified hours)
   */
  isShortShift(minHours: number = 4): boolean {
    return this.props.totalHours !== null && this.props.totalHours < minHours;
  }

  /**
   * Check if entry time is within normal hours
   */
  hasNormalEntryTime(earliestHour: number = 6, latestHour: number = 10): boolean {
    if (!this.props.entryTime) return false;
    
    const entryHour = this.props.entryTime.getHours();
    return entryHour >= earliestHour && entryHour <= latestHour;
  }

  /**
   * Check if exit time is within normal hours
   */
  hasNormalExitTime(earliestHour: number = 14, latestHour: number = 20): boolean {
    if (!this.props.exitTime) return false;
    
    const exitHour = this.props.exitTime.getHours();
    return exitHour >= earliestHour && exitHour <= latestHour;
  }

  /**
   * Check if attendance is for today
   */
  isToday(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendanceDate = new Date(this.props.date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    return today.getTime() === attendanceDate.getTime();
  }

  /**
   * Check if attendance is from yesterday
   */
  isYesterday(): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const attendanceDate = new Date(this.props.date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    return yesterday.getTime() === attendanceDate.getTime();
  }

  /**
   * Get formatted duration
   */
  getFormattedDuration(): string {
    if (!this.props.totalHours) return 'N/A';
    
    const hours = Math.floor(this.props.totalHours);
    const minutes = Math.floor((this.props.totalHours - hours) * 60);
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get status summary
   */
  getStatusSummary(): {
    status: 'ACTIVE' | 'COMPLETE' | 'INCOMPLETE';
    hasEntry: boolean;
    hasExit: boolean;
    duration: string;
  } {
    let status: 'ACTIVE' | 'COMPLETE' | 'INCOMPLETE';
    
    if (this.isActive()) {
      status = 'ACTIVE';
    } else if (this.isComplete) {
      status = 'COMPLETE';
    } else {
      status = 'INCOMPLETE';
    }

    return {
      status,
      hasEntry: this.props.entryTime !== null,
      hasExit: this.props.exitTime !== null,
      duration: this.getFormattedDuration(),
    };
  }

  equals(other: AttendanceEntity): boolean {
    return this.props.id === other.props.id;
  }

  toString(): string {
    const dateStr = this.props.date.toISOString().split('T')[0];
    const statusSummary = this.getStatusSummary();
    return `Attendance(${this.props.id}, ${dateStr}, ${statusSummary.status})`;
  }

  toJSON() {
    return {
      id: this.props.id,
      date: this.props.date.toISOString().split('T')[0],
      entryTime: this.props.entryTime?.toISOString() || null,
      exitTime: this.props.exitTime?.toISOString() || null,
      totalHours: this.props.totalHours,
      isComplete: this.props.isComplete,
      notes: this.props.notes,
      workerId: this.props.workerId,
      depotId: this.props.depotId,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      statusSummary: this.getStatusSummary(),
    };
  }
}
