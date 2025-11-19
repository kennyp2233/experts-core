import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para un turno individual en el resumen
 */
export class ShiftSummaryDto {
  @ApiProperty({ description: 'ID del attendance' })
  attendanceId: string;

  @ApiProperty({ description: 'Fecha del turno' })
  date: string;

  @ApiProperty({ description: 'Hora de entrada', nullable: true })
  entryTime: string | null;

  @ApiProperty({ description: 'Hora de salida', nullable: true })
  exitTime: string | null;

  @ApiProperty({ description: 'Horas totales (brutas)', nullable: true })
  totalHours: number | null;

  @ApiProperty({ description: 'Minutos de break deducidos', nullable: true })
  breakMinutes: number | null;

  @ApiProperty({ description: 'Horas netas (con breaks deducidos)', nullable: true })
  netHours: number | null;

  @ApiProperty({ description: 'Turno completo (entrada y salida registradas)' })
  isComplete: boolean;

  @ApiProperty({ description: 'Estado del turno', enum: ['ACTIVE', 'COMPLETE', 'INCOMPLETE'] })
  status: 'ACTIVE' | 'COMPLETE' | 'INCOMPLETE';

  @ApiProperty({ description: 'Notas del turno', nullable: true })
  notes: string | null;
}

/**
 * DTO para estadísticas del resumen
 */
export class WorkerSummaryStatsDto {
  @ApiProperty({ description: 'Días totales en el período' })
  totalDays: number;

  @ApiProperty({ description: 'Días trabajados (con al menos entrada)' })
  workDays: number;

  @ApiProperty({ description: 'Días ausentes' })
  absentDays: number;

  @ApiProperty({ description: 'Porcentaje de asistencia' })
  attendanceRate: number;

  @ApiProperty({ description: 'Total de horas netas trabajadas (con breaks deducidos)' })
  totalNetHours: number;

  @ApiProperty({ description: 'Promedio de horas netas por día trabajado' })
  averageNetHoursPerDay: number;

  @ApiProperty({ description: 'Total de turnos completos' })
  completedShifts: number;

  @ApiProperty({ description: 'Total de turnos incompletos' })
  incompleteShifts: number;
}

/**
 * DTO para metadata de paginación
 */
export class PaginationMetadataDto {
  @ApiProperty({ description: 'Página actual' })
  currentPage: number;

  @ApiProperty({ description: 'Tamaño de página' })
  pageSize: number;

  @ApiProperty({ description: 'Total de elementos' })
  totalItems: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Hay más páginas disponibles' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Hay página anterior' })
  hasPreviousPage: boolean;
}

/**
 * DTO para respuesta del resumen de trabajador
 */
export class WorkerSummaryResponseDto {
  @ApiProperty({ description: 'ID del trabajador' })
  workerId: string;

  @ApiProperty({ description: 'Nombre completo del trabajador' })
  workerName: string;

  @ApiProperty({ description: 'Email del trabajador', nullable: true })
  email: string | null;

  @ApiProperty({ description: 'Foto de perfil', nullable: true })
  profilePhoto: string | null;

  @ApiProperty({ description: 'ID del depot' })
  depotId: string;

  @ApiProperty({ description: 'Rango de fechas del reporte' })
  dateRange: {
    from: string;
    to: string;
  };

  @ApiProperty({ description: 'Estadísticas del período', type: WorkerSummaryStatsDto })
  stats: WorkerSummaryStatsDto;

  @ApiProperty({ description: 'Lista de turnos', type: [ShiftSummaryDto] })
  shifts: ShiftSummaryDto[];

  @ApiProperty({ description: 'Metadata de paginación', type: PaginationMetadataDto })
  pagination: PaginationMetadataDto;
}
