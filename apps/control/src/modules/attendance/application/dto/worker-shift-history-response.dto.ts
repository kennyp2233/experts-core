import { Expose, Type } from 'class-transformer';

export class ShiftSummaryDto {
  @Expose()
  shiftId: string;

  @Expose()
  date: string;

  @Expose()
  @Type(() => Date)
  entryTime: Date | null;

  @Expose()
  @Type(() => Date)
  exitTime: Date | null;

  @Expose()
  totalHours: number | null;

  @Expose()
  status: 'COMPLETE' | 'INCOMPLETE' | 'ACTIVE';

  @Expose()
  entryLocation?: string;

  @Expose()
  exitLocation?: string;

  @Expose()
  hasAuditIssues: boolean;

  @Expose()
  recordsCount: number;
}

export class WorkerShiftHistoryResponseDto {
  @Expose()
  workerId: string;

  @Expose()
  workerName: string;

  @Expose()
  @Type(() => Object)
  dateRange: { from: Date; to: Date };

  @Expose()
  @Type(() => ShiftSummaryDto)
  shifts: ShiftSummaryDto[];

  @Expose()
  @Type(() => Object)
  summary: {
    totalShifts: number;
    completeShifts: number;
    incompleteShifts: number;
    totalHours: number;
    averageHoursPerShift: number;
  };
}