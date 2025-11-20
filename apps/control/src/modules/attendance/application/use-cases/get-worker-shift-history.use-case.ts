import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { WorkersService } from '../../../workers/workers.service';
import { GetWorkerHistoryQueryDto } from '../dto/get-worker-history-query.dto';
import { WorkerShiftHistoryResponseDto, ShiftSummaryDto } from '../dto/worker-shift-history-response.dto';

@Injectable()
export class GetWorkerShiftHistoryUseCase {
  private readonly logger = new Logger(GetWorkerShiftHistoryUseCase.name);

  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly workersService: WorkersService,
  ) {}

  async execute(
    workerId: string,
    query: GetWorkerHistoryQueryDto,
  ): Promise<WorkerShiftHistoryResponseDto> {
    this.logger.log(`🚀 Ejecutando caso de uso - Obtener historial de turnos`);
    this.logger.debug(`Parámetros:`, { workerId, query });

    try {
      // Validar que el worker existe
      const worker = await this.workersService.findOne(workerId);
      if (!worker) {
        throw new NotFoundException(`Worker con ID ${workerId} no encontrado`);
      }

    // Establecer rango de fechas por defecto (últimos 30 días)
    // Ajustar fechas para zona horaria de Ecuador (UTC-5)
    let dateTo: Date;
    let dateFrom: Date;

    if (query.dateTo) {
      // Si dateTo es string tipo "2025-09-13", crear fecha local Ecuador y convertir a UTC
      const dateToLocal = new Date(query.dateTo + 'T23:59:59.999-05:00'); // Fin del día Ecuador
      dateTo = dateToLocal;
    } else {
      dateTo = new Date();
    }

    if (query.dateFrom) {
      // Si dateFrom es string tipo "2025-08-14", crear fecha local Ecuador y convertir a UTC
      const dateFromLocal = new Date(query.dateFrom + 'T00:00:00.000-05:00'); // Inicio del día Ecuador
      dateFrom = dateFromLocal;
    } else {
      dateFrom = new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás
    }

    this.logger.debug(`Rango de fechas:`, { dateFrom, dateTo });      // Obtener asistencias del worker en el rango de fechas
      const attendances = await this.attendanceRepository.findAttendances(
        {
          workerId,
          dateFrom,
          dateTo,
          filterByEntryTime: true,
        },
        query.limit,
        query.offset,
      );

      // Agrupar por shiftId (cada asistencia representa un turno)
      const shifts: ShiftSummaryDto[] = await Promise.all(
        attendances.map(async (attendance) => {
          this.logger.debug(`Procesando attendance ${attendance.id}: entry=${attendance.entryTime}, exit=${attendance.exitTime}, totalHours=${attendance.totalHours}, netHours=${attendance.netHours}`);
          // Obtener registros del turno
          const records = await this.attendanceRepository.findRecordsByAttendance(attendance.id);

          // Determinar status del turno
          let status: 'COMPLETE' | 'INCOMPLETE' | 'ACTIVE';
          if (attendance.isComplete) {
            status = 'COMPLETE';
          } else if (attendance.entryTime && !attendance.exitTime) {
            status = 'ACTIVE';
          } else {
            status = 'INCOMPLETE';
          }

          // Obtener ubicaciones de entrada y salida
          const entryRecord = records.find(r => r.type === 'ENTRY');
          const exitRecord = records.find(r => r.type === 'EXIT');

          // Verificar si hay problemas de auditoría (registros sospechosos)
          const hasAuditIssues = records.some(r => r.status === 'SUSPICIOUS' || r.status === 'REJECTED');

          return {
            shiftId: attendance.id,
            date: attendance.date.toISOString().split('T')[0],
            entryTime: attendance.entryTime,
            exitTime: attendance.exitTime,
            totalHours: attendance.totalHours,
            netHours: attendance.netHours,
            status,
            entryLocation: entryRecord?.gpsCoordinate ? `${entryRecord.gpsCoordinate.latitude}, ${entryRecord.gpsCoordinate.longitude}` : undefined,
            exitLocation: exitRecord?.gpsCoordinate ? `${exitRecord.gpsCoordinate.latitude}, ${exitRecord.gpsCoordinate.longitude}` : undefined,
            hasAuditIssues,
            recordsCount: records.length,
          };
        }),
      );

      // Calcular estadísticas del resumen
      const completeShifts = shifts.filter(s => s.status === 'COMPLETE').length;
      const incompleteShifts = shifts.filter(s => s.status === 'INCOMPLETE').length;
      const totalHours = shifts
        .filter(s => s.totalHours !== null)
        .reduce((sum, s) => sum + (Number(s.totalHours) || 0), 0);
      const averageHoursPerShift = shifts.length > 0 ? totalHours / shifts.length : 0;
      const totalNetHours = shifts
        .filter(s => s.netHours !== null)
        .reduce((sum, s) => sum + (Number(s.netHours) || 0), 0);
      const averageNetHoursPerShift = shifts.length > 0 ? totalNetHours / shifts.length : 0;

      this.logger.debug(`Summary: totalShifts=${shifts.length}, totalHours=${totalHours.toFixed(2)}, averageHoursPerShift=${averageHoursPerShift.toFixed(2)}, totalNetHours=${totalNetHours.toFixed(2)}, averageNetHoursPerShift=${averageNetHoursPerShift.toFixed(2)}`);

      const response: WorkerShiftHistoryResponseDto = {
        workerId,
        workerName: `${worker.firstName} ${worker.lastName}`,
        dateRange: { from: dateFrom, to: dateTo },
        shifts,
        summary: {
          totalShifts: shifts.length,
          completeShifts,
          incompleteShifts,
          totalHours,
          averageHoursPerShift,
          totalNetHours,
          averageNetHoursPerShift,
        },
      };

      this.logger.log(`✅ Caso de uso completado exitosamente`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error en caso de uso:`, error);
      throw error;
    }
  }
}