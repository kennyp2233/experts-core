import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { WorkersService } from '../../../workers/workers.service';
import { GetWorkerHistoryQueryDto } from '../dto/get-worker-history-query.dto';
import { WorkerShiftHistoryResponseDto, ShiftSummaryDto } from '../dto/worker-shift-history-response.dto';

@Injectable()
export class GetWorkerShiftHistoryUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly workersService: WorkersService,
  ) {}

  async execute(
    workerId: string,
    query: GetWorkerHistoryQueryDto,
  ): Promise<WorkerShiftHistoryResponseDto> {
    console.log('[GetWorkerShiftHistoryUseCase] 🚀 Ejecutando caso de uso - Obtener historial de turnos');
    console.log('[GetWorkerShiftHistoryUseCase] Parámetros:', { workerId, query });

    try {
      // Validar que el worker existe
      const worker = await this.workersService.findOne(workerId);
      if (!worker) {
        throw new NotFoundException(`Worker con ID ${workerId} no encontrado`);
      }

      // Establecer rango de fechas por defecto (últimos 30 días)
      const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();
      const dateFrom = query.dateFrom
        ? new Date(query.dateFrom)
        : new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás

      console.log('[GetWorkerShiftHistoryUseCase] Rango de fechas:', { dateFrom, dateTo });

      // Obtener asistencias del worker en el rango de fechas
      const attendances = await this.attendanceRepository.findAttendances(
        {
          workerId,
          dateFrom,
          dateTo,
        },
        query.limit,
        query.offset,
      );

      console.log(`[GetWorkerShiftHistoryUseCase] Encontradas ${attendances.length} asistencias`);

      // Agrupar por shiftId (cada asistencia representa un turno)
      const shifts: ShiftSummaryDto[] = await Promise.all(
        attendances.map(async (attendance) => {
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
        .reduce((sum, s) => sum + (s.totalHours || 0), 0);
      const averageHoursPerShift = shifts.length > 0 ? totalHours / shifts.length : 0;

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
        },
      };

      console.log('[GetWorkerShiftHistoryUseCase] ✅ Caso de uso completado exitosamente');
      return response;
    } catch (error) {
      console.error('[GetWorkerShiftHistoryUseCase] ❌ Error en caso de uso:', error);
      throw error;
    }
  }
}