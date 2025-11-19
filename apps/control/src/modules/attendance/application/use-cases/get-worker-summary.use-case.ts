import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { WorkersService } from '../../../workers/workers.service';
import { GetWorkerSummaryQueryDto } from '../dto/get-worker-summary-query.dto';
import {
  WorkerSummaryResponseDto,
  ShiftSummaryDto,
  WorkerSummaryStatsDto,
  PaginationMetadataDto,
} from '../dto/worker-summary-response.dto';

@Injectable()
export class GetWorkerSummaryUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly workersService: WorkersService,
  ) {}

  async execute(
    workerId: string,
    query: GetWorkerSummaryQueryDto,
  ): Promise<WorkerSummaryResponseDto> {
    console.log('[GetWorkerSummaryUseCase] 🚀 Ejecutando caso de uso - Obtener resumen de trabajador');
    console.log('[GetWorkerSummaryUseCase] Parámetros:', { workerId, query });

    try {
      // Validar que el worker existe
      const worker = await this.workersService.findOne(workerId);
      if (!worker) {
        throw new NotFoundException(`Worker con ID ${workerId} no encontrado`);
      }

      // Determinar rango de fechas
      const { dateFrom, dateTo } = this.calculateDateRange(query);

      console.log('[GetWorkerSummaryUseCase] Rango de fechas:', { dateFrom, dateTo });

      // Obtener TODOS los attendances del rango (sin paginación) para calcular stats
      const allAttendances = await this.attendanceRepository.findAttendances({
        workerId,
        dateFrom,
        dateTo,
      });

      console.log(`[GetWorkerSummaryUseCase] Total de asistencias encontradas: ${allAttendances.length}`);

      // Calcular estadísticas del período completo
      const stats = this.calculateStats(allAttendances, dateFrom, dateTo);

      // Aplicar paginación a los attendances
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // Ordenar por fecha descendente y paginar
      const sortedAttendances = [...allAttendances].sort((a, b) =>
        b.date.getTime() - a.date.getTime()
      );
      const paginatedAttendances = sortedAttendances.slice(skip, skip + take);

      // Convertir attendances a ShiftSummaryDto
      const shifts: ShiftSummaryDto[] = paginatedAttendances.map(att => {
        const statusSummary = att.getStatusSummary();

        return {
          attendanceId: att.id,
          date: att.date.toISOString().split('T')[0],
          entryTime: att.entryTime?.toISOString() || null,
          exitTime: att.exitTime?.toISOString() || null,
          totalHours: att.totalHours,
          breakMinutes: att.breakMinutes,
          netHours: att.netHours,
          isComplete: att.isComplete,
          status: statusSummary.status,
          notes: att.notes,
        };
      });

      // Calcular metadata de paginación
      const totalItems = allAttendances.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const pagination: PaginationMetadataDto = {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      const response: WorkerSummaryResponseDto = {
        workerId,
        workerName: `${worker.firstName} ${worker.lastName}`,
        email: worker.email || null,
        profilePhoto: worker.profilePhoto || null,
        depotId: worker.depotId,
        dateRange: {
          from: dateFrom.toISOString().split('T')[0],
          to: dateTo.toISOString().split('T')[0],
        },
        stats,
        shifts,
        pagination,
      };

      console.log('[GetWorkerSummaryUseCase] ✅ Caso de uso completado exitosamente:', {
        totalShifts: allAttendances.length,
        paginatedShifts: shifts.length,
        attendanceRate: stats.attendanceRate,
        totalNetHours: stats.totalNetHours,
      });

      return response;
    } catch (error) {
      console.error('[GetWorkerSummaryUseCase] ❌ Error en caso de uso:', error);
      throw error;
    }
  }

  private calculateDateRange(query: GetWorkerSummaryQueryDto): { dateFrom: Date; dateTo: Date } {
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();
    dateTo.setHours(23, 59, 59, 999); // Incluir todo el día

    let dateFrom: Date;
    if (query.dateFrom) {
      dateFrom = new Date(query.dateFrom);
      dateFrom.setHours(0, 0, 0, 0);
    } else {
      // Por defecto: último mes
      dateFrom = new Date(dateTo);
      dateFrom.setDate(dateTo.getDate() - 30);
      dateFrom.setHours(0, 0, 0, 0);
    }

    return { dateFrom, dateTo };
  }

  private calculateStats(
    attendances: any[],
    dateFrom: Date,
    dateTo: Date,
  ): WorkerSummaryStatsDto {
    // Calcular días totales en el período
    const totalDays = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));

    // Días trabajados: attendances con al menos entrada
    const workDays = attendances.filter(a => a.entryTime).length;

    // Días ausentes
    const absentDays = totalDays - workDays;

    // Porcentaje de asistencia
    const attendanceRate = totalDays > 0 ? (workDays / totalDays) * 100 : 0;

    // Turnos completos e incompletos
    const completedShifts = attendances.filter(a => a.isComplete).length;
    const incompleteShifts = workDays - completedShifts;

    // Total de horas netas (con breaks deducidos)
    const totalNetHours = attendances
      .filter(a => a.netHours !== null)
      .reduce((sum, a) => sum + (a.netHours || 0), 0);

    // Promedio de horas netas por día trabajado
    const averageNetHoursPerDay = workDays > 0 ? totalNetHours / workDays : 0;

    return {
      totalDays,
      workDays,
      absentDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100, // 2 decimales
      totalNetHours: Math.round(totalNetHours * 100) / 100, // 2 decimales
      averageNetHoursPerDay: Math.round(averageNetHoursPerDay * 100) / 100, // 2 decimales
      completedShifts,
      incompleteShifts,
    };
  }
}
