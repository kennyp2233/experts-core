import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para tarjeta individual de worker en el dashboard
 */
export class WorkerCardDto {
  @ApiProperty({ description: 'ID del trabajador' })
  workerId: string;

  @ApiProperty({ description: 'Nombre del trabajador' })
  workerName: string;

  @ApiProperty({ description: 'Email del trabajador', required: false })
  email?: string;

  @ApiProperty({ description: 'Foto de perfil', required: false })
  profilePhoto?: string;

  @ApiProperty({
    description: 'Estado del turno',
    enum: ['ON_SHIFT', 'OFF_SHIFT'],
  })
  status: 'ON_SHIFT' | 'OFF_SHIFT';

  @ApiProperty({ description: 'Horas trabajadas hoy (netas, con breaks deducidos)', required: false })
  todayNetHours: number | null;

  @ApiProperty({ description: 'Hora de entrada de hoy', required: false })
  todayEntryTime: string | null;

  @ApiProperty({ description: 'Hora de salida de hoy', required: false })
  todayExitTime: string | null;

  @ApiProperty({ description: 'ID del attendance de hoy', required: false })
  todayAttendanceId: string | null;
}

/**
 * DTO para respuesta del dashboard de asistencias
 */
export class DashboardResponseDto {
  @ApiProperty({ description: 'Total de trabajadores en el depot' })
  totalWorkers: number;

  @ApiProperty({ description: 'Trabajadores actualmente en turno' })
  workersOnShift: number;

  @ApiProperty({ description: 'Trabajadores fuera de turno' })
  workersOffShift: number;

  @ApiProperty({ description: 'Total de horas trabajadas hoy (netas, con breaks deducidos)' })
  totalNetHoursToday: number;

  @ApiProperty({ description: 'Fecha del reporte' })
  date: string;

  @ApiProperty({ description: 'Tarjetas de trabajadores', type: [WorkerCardDto] })
  workerCards: WorkerCardDto[];
}
