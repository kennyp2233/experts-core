export class AttendanceResponseDto {
  success: boolean;
  recordId: string;
  attendanceId: string;
  status: string;
  fraudScore: number;
  message: string;
  needsManualReview: boolean;
  validationErrors?: Array<{
    level: string;
    error: string;
    severity: string;
  }>;
  shift?: {
    date: string;
    entryTime: string | null;
    exitTime: string | null;
    isComplete: boolean;
    totalHours?: number;
  };
}

export class CurrentShiftResponseDto {
  workerId: string;
  currentShift: {
    attendanceId: string | null;
    date: string | null;
    entryTime: string | null;
    exitTime: string | null;
    isActive: boolean;
    isComplete: boolean;
    totalHours: number | null;
  };
  lastRecord: {
    recordId: string | null;
    type: string | null;
    timestamp: string | null;
    status: string | null;
  } | null;
  canRecord: {
    entry: boolean;
    exit: boolean;
    reason?: string;
  };
}

export class AttendanceHistoryDto {
  attendanceId: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  totalHours: number | null;
  isComplete: boolean;
  status: 'ACTIVE' | 'COMPLETE' | 'INCOMPLETE';
  records: {
    recordId: string;
    type: string;
    timestamp: string;
    status: string;
    fraudScore?: number;
  }[];
}

export class AttendanceHistoryResponseDto {
  workerId: string;
  attendances: AttendanceHistoryDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
