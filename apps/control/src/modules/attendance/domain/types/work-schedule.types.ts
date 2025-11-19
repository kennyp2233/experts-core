/**
 * Tipos para sistema de horarios configurables
 */

/**
 * Ventana de tiempo (formato HH:mm)
 */
export interface TimeWindow {
  start: string; // "21:00"
  end: string;   // "23:00"
}

/**
 * Horario de trabajo completo
 */
export interface WorkSchedule {
  id: string;
  name: string;
  description?: string;

  // Horarios
  entryWindow: TimeWindow;
  exitWindow: TimeWindow;

  // Tolerancias (en minutos)
  entryToleranceMinutes: number;
  exitToleranceMinutes: number;

  // Días aplicables (1=Lun, 2=Mar, ..., 7=Dom, 0=Dom alternativo)
  daysOfWeek: number[];

  // Configuración
  timezone: string;  // IANA timezone: "America/Guayaquil"
  isStrict: boolean; // true = rechaza fuera horario, false = marca sospechoso
  isActive: boolean;

  // Metadata
  depotId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Asignación de horario a worker
 */
export interface WorkerScheduleAssignment {
  id: string;
  workerId: string;
  scheduleId: string;

  // Overrides opcionales
  customEntryStart?: string;
  customEntryEnd?: string;
  customExitStart?: string;
  customExitEnd?: string;
  customEntryTolerance?: number;
  customExitTolerance?: number;
  customDaysOfWeek?: number[];

  // Vigencia
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones populadas
  schedule?: WorkSchedule;
}

/**
 * Excepción de horario (días festivos, etc)
 */
export interface ScheduleException {
  id: string;
  scheduleId: string;
  date: Date;
  reason: ExceptionReason;

  // Horarios override
  entryStart?: string;
  entryEnd?: string;
  exitStart?: string;
  exitEnd?: string;

  // Si false, no hay trabajo ese día
  isWorkingDay: boolean;

  // Metadata
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Razones de excepción
 */
export enum ExceptionReason {
  HOLIDAY = 'HOLIDAY',
  SPECIAL_EVENT = 'SPECIAL_EVENT',
  OVERTIME = 'OVERTIME',
  MAINTENANCE = 'MAINTENANCE',
  EMERGENCY = 'EMERGENCY',
  CUSTOM = 'CUSTOM',
}

/**
 * Horario efectivo (después de aplicar overrides y excepciones)
 */
export interface EffectiveSchedule {
  scheduleId: string;
  scheduleName: string;

  // Horarios finales (ya con overrides aplicados)
  entryWindow: TimeWindow;
  exitWindow: TimeWindow;

  // Tolerancias finales
  entryToleranceMinutes: number;
  exitToleranceMinutes: number;

  // Días aplicables
  daysOfWeek: number[];

  // Configuración
  timezone: string;
  isStrict: boolean;

  // Origen de la configuración
  source: {
    baseSchedule: boolean;
    hasWorkerOverrides: boolean;
    hasException: boolean;
    exceptionReason?: ExceptionReason;
  };
}

/**
 * Resultado de validación de horario
 */
export interface ScheduleValidationResult {
  isValid: boolean;
  isWithinWindow: boolean;
  message: string;

  details: {
    recordTime: string;      // "22:30"
    expectedWindow: TimeWindow;
    tolerance: number;
    timezone: string;
    effectiveSchedule?: EffectiveSchedule;
    outsideBy?: number;      // Minutos fuera del rango
  };
}

/**
 * Estadísticas de cumplimiento de horario
 */
export interface ScheduleComplianceStats {
  workerId: string;
  period: {
    from: Date;
    to: Date;
  };

  // Contadores
  totalRecords: number;
  onTimeRecords: number;
  lateRecords: number;
  earlyRecords: number;
  outsideScheduleRecords: number;

  // Porcentajes
  complianceRate: number;  // 0-100
  punctualityRate: number; // 0-100

  // Promedios
  avgMinutesLate: number;
  avgMinutesEarly: number;
}

/**
 * DTO para crear schedule
 */
export interface CreateScheduleDto {
  name: string;
  description?: string;

  entryStart: string;
  entryEnd: string;
  exitStart: string;
  exitEnd: string;

  entryToleranceMinutes?: number;
  exitToleranceMinutes?: number;

  daysOfWeek: number[];
  timezone?: string;
  isStrict?: boolean;

  depotId?: string;
}

/**
 * DTO para actualizar schedule
 */
export interface UpdateScheduleDto {
  name?: string;
  description?: string;

  entryStart?: string;
  entryEnd?: string;
  exitStart?: string;
  exitEnd?: string;

  entryToleranceMinutes?: number;
  exitToleranceMinutes?: number;

  daysOfWeek?: number[];
  timezone?: string;
  isStrict?: boolean;
  isActive?: boolean;
}

/**
 * DTO para asignar schedule a worker
 */
export interface AssignScheduleDto {
  workerId: string;
  scheduleId: string;

  // Overrides opcionales
  customEntryStart?: string;
  customEntryEnd?: string;
  customExitStart?: string;
  customExitEnd?: string;
  customEntryTolerance?: number;
  customExitTolerance?: number;
  customDaysOfWeek?: number[];

  effectiveFrom?: Date;
  effectiveTo?: Date;
  notes?: string;
}

/**
 * DTO para crear excepción
 */
export interface CreateExceptionDto {
  scheduleId: string;
  date: Date;
  reason: ExceptionReason;

  entryStart?: string;
  entryEnd?: string;
  exitStart?: string;
  exitEnd?: string;

  isWorkingDay?: boolean;
  description?: string;
}
