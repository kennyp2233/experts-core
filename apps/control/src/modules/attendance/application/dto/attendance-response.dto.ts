export class AttendanceResponseDto {
  recordId: string;
  attendanceId: string;
  success: boolean; // TRUE = registro exitoso (turno actualizado), FALSE = error técnico
  recordStatus: string; // ACCEPTED, SUSPICIOUS, REJECTED - Solo informativo para admin
  fraudScore: number;
  message: string;
  shift: {
    date: string;
    entryTime: string | null;
    exitTime: string | null;
    isComplete: boolean;
    totalHours?: number;
  };
  // ✅ NUEVO: Estado actualizado del turno para evitar consulta adicional
  workerStatus: {
    isOnShift: boolean; // true = turno activo (tiene entrada sin salida)
    currentShiftId: string | null;
    lastActionType: 'ENTRY' | 'EXIT' | null;
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
