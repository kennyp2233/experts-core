import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { WorkersService } from '../../../workers/workers.service';
import { GetWorkerStatsQueryDto } from '../dto/get-worker-stats-query.dto';
import { WorkerDetailedStatsResponseDto, StatsSnapshot } from '../dto/worker-detailed-stats-response.dto';

@Injectable()
export class GetWorkerDetailedStatsUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly workersService: WorkersService,
  ) {}

  async execute(
    workerId: string,
    query: GetWorkerStatsQueryDto,
  ): Promise<WorkerDetailedStatsResponseDto> {
    console.log('[GetWorkerDetailedStatsUseCase] 🚀 Ejecutando caso de uso - Obtener estadísticas detalladas del worker');
    console.log('[GetWorkerDetailedStatsUseCase] Parámetros:', { workerId, query });

    try {
      // Validar que el worker existe
      const worker = await this.workersService.findOne(workerId);
      if (!worker) {
        throw new NotFoundException(`Worker con ID ${workerId} no encontrado`);
      }

      // Determinar rango de fechas
      const { dateFrom, dateTo } = this.calculateDateRange(query);

      console.log('[GetWorkerDetailedStatsUseCase] Rango de fechas:', { dateFrom, dateTo });

      // Obtener asistencias del worker en el rango
      const attendances = await this.attendanceRepository.findAttendances({
        workerId,
        dateFrom,
        dateTo,
      });

      // Obtener todos los registros para análisis detallado
      const allRecords: any[] = [];
      for (const attendance of attendances) {
        const records = await this.attendanceRepository.findRecordsByAttendance(attendance.id);
        allRecords.push(...records);
      }

      console.log(`[GetWorkerDetailedStatsUseCase] Analizando ${attendances.length} asistencias y ${allRecords.length} registros`);

      // Calcular estadísticas de asistencia
      const attendanceStats = this.calculateAttendanceStats(attendances, dateFrom, dateTo);

      // Calcular estadísticas de horas
      const hoursStats = this.calculateHoursStats(attendances);

      // Calcular estadísticas de puntualidad
      const punctualityStats = this.calculatePunctualityStats(attendances, allRecords);

      // Calcular indicadores de riesgo
      const riskStats = this.calculateRiskStats(allRecords);

      // Calcular patrones
      const patternsStats = this.calculatePatternsStats(attendances, allRecords);

      // Calcular comparativas (simplificado - necesitaríamos datos del depot)
      const comparativesStats = await this.calculateComparativesStats(worker.depotId, workerId, dateFrom, dateTo);

      // Calcular tendencias
      const trendsStats = await this.calculateTrendsStats(workerId);

      const response: WorkerDetailedStatsResponseDto = {
        workerId,
        workerName: `${worker.firstName} ${worker.lastName}`,
        depotId: worker.depotId,
        dateRange: { from: dateFrom, to: dateTo },
        attendance: attendanceStats,
        hours: hoursStats,
        punctuality: punctualityStats,
        riskIndicators: riskStats,
        patterns: patternsStats,
        comparatives: comparativesStats,
        trends: trendsStats,
      };

      console.log('[GetWorkerDetailedStatsUseCase] ✅ Caso de uso completado exitosamente');
      return response;
    } catch (error) {
      console.error('[GetWorkerDetailedStatsUseCase] ❌ Error en caso de uso:', error);
      throw error;
    }
  }

  private calculateDateRange(query: GetWorkerStatsQueryDto): { dateFrom: Date; dateTo: Date } {
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    let dateFrom: Date;
    if (query.dateFrom) {
      dateFrom = new Date(query.dateFrom);
    } else if (query.period) {
      const days = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      }[query.period];
      dateFrom = new Date(dateTo.getTime() - days * 24 * 60 * 60 * 1000);
    } else {
      // Por defecto último mes
      dateFrom = new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { dateFrom, dateTo };
  }

  private calculateAttendanceStats(attendances: any[], dateFrom: Date, dateTo: Date) {
    const totalDays = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    const workDays = attendances.filter(a => a.entryTime).length;
    const completeDays = attendances.filter(a => a.isComplete).length;
    const incompleteDays = workDays - completeDays;
    const absentDays = totalDays - workDays;
    const attendanceRate = totalDays > 0 ? (workDays / totalDays) * 100 : 0;

    return {
      totalDays,
      workDays,
      absentDays,
      incompleteDays,
      attendanceRate,
    };
  }

  private calculateHoursStats(attendances: any[]) {
    const completeAttendances = attendances.filter(a => a.isComplete && a.totalHours);
    const totalHours = completeAttendances.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const averageHoursPerDay = completeAttendances.length > 0 ? totalHours / completeAttendances.length : 0;

    // Asumir jornada estándar de 8 horas
    const standardHours = 8;
    const overtimeHours = completeAttendances
      .filter(a => (a.totalHours || 0) > standardHours)
      .reduce((sum, a) => sum + ((a.totalHours || 0) - standardHours), 0);
    const undertimeHours = completeAttendances
      .filter(a => (a.totalHours || 0) < standardHours)
      .reduce((sum, a) => sum + (standardHours - (a.totalHours || 0)), 0);

    const efficiency = averageHoursPerDay > 0 ? (averageHoursPerDay / standardHours) * 100 : 0;

    return {
      totalHours,
      averageHoursPerDay,
      overtimeHours,
      undertimeHours,
      efficiency,
    };
  }

  private calculatePunctualityStats(attendances: any[], records: any[]) {
    const entryRecords = records.filter(r => r.type === 'ENTRY');
    const exitRecords = records.filter(r => r.type === 'EXIT');

    // Asumir horario estándar: entrada 8:00, salida 17:00
    const standardEntryHour = 8;
    const standardExitHour = 17;
    const toleranceMinutes = 15;

    let onTimeArrivals = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    const delays: number[] = [];

    entryRecords.forEach(record => {
      const entryHour = record.timestamp.getHours() + record.timestamp.getMinutes() / 60;
      const delayMinutes = (entryHour - standardEntryHour) * 60;

      if (Math.abs(delayMinutes) <= toleranceMinutes) {
        onTimeArrivals++;
      } else if (delayMinutes > 0) {
        lateArrivals++;
        delays.push(delayMinutes);
      }
    });

    exitRecords.forEach(record => {
      const exitHour = record.timestamp.getHours() + record.timestamp.getMinutes() / 60;
      const earlyMinutes = (standardExitHour - exitHour) * 60;

      if (earlyMinutes > toleranceMinutes) {
        earlyDepartures++;
      }
    });

    const averageDelayMinutes = delays.length > 0
      ? delays.reduce((sum, d) => sum + d, 0) / delays.length
      : 0;

    const totalArrivals = onTimeArrivals + lateArrivals;
    const punctualityScore = totalArrivals > 0 ? (onTimeArrivals / totalArrivals) * 100 : 100;

    return {
      onTimeArrivals,
      lateArrivals,
      earlyDepartures,
      averageDelayMinutes,
      punctualityScore,
    };
  }

  private calculateRiskStats(records: any[]) {
    const suspiciousRecords = records.filter(r => r.status === 'SUSPICIOUS').length;
    const fraudAlerts = records.filter(r => r.status === 'REJECTED').length;
    const manualReviewsRequired = records.filter(r =>
      r.status === 'SUSPICIOUS' || (r.fraudScore && r.fraudScore.score > 50)
    ).length;

    const overallRiskScore = records.length > 0
      ? records.reduce((sum, r) => sum + (r.fraudScore?.score || 0), 0) / records.length
      : 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (overallRiskScore > 70) {
      riskLevel = 'HIGH';
    } else if (overallRiskScore > 30) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Factores de riesgo principales (simplificado)
    const topRiskFactors: string[] = [];
    if (suspiciousRecords > 0) topRiskFactors.push('Registros sospechosos');
    if (fraudAlerts > 0) topRiskFactors.push('Alertas de fraude');
    if (manualReviewsRequired > 0) topRiskFactors.push('Revisiones manuales requeridas');

    return {
      overallRiskScore,
      suspiciousRecords,
      fraudAlerts,
      manualReviewsRequired,
      riskLevel,
      topRiskFactors,
    };
  }

  private calculatePatternsStats(attendances: any[], records: any[]) {
    const entryRecords = records.filter(r => r.type === 'ENTRY');

    // Calcular hora preferida de llegada
    const entryHours = entryRecords.map(r => r.timestamp.getHours());
    const preferredArrivalTime = entryHours.length > 0
      ? Math.round(entryHours.reduce((sum, h) => sum + h, 0) / entryHours.length)
      : 8;

    // Calcular hora preferida de salida
    const exitRecords = records.filter(r => r.type === 'EXIT');
    const exitHours = exitRecords.map(r => r.timestamp.getHours());
    const preferredDepartureTime = exitHours.length > 0
      ? Math.round(exitHours.reduce((sum, h) => sum + h, 0) / exitHours.length)
      : 17;

    // Calcular consistencia (simplificado)
    const consistencyScore = entryRecords.length > 1
      ? 100 - (this.calculateStandardDeviation(entryHours) * 10)
      : 100;

    // Rendimiento por día de la semana
    const weekdayPerformance = this.calculateWeekdayPerformance(attendances);

    return {
      preferredArrivalTime: `${preferredArrivalTime}:00`,
      preferredDepartureTime: `${preferredDepartureTime}:00`,
      consistencyScore: Math.max(0, Math.min(100, consistencyScore)),
      weekdayPerformance,
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateWeekdayPerformance(attendances: any[]) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const performance: { [key: string]: { hours: number[]; attendance: number } } = {};

    days.forEach(day => {
      performance[day] = { hours: [], attendance: 0 };
    });

    attendances.forEach(attendance => {
      const dayName = days[attendance.date.getDay()];
      if (attendance.totalHours) {
        performance[dayName].hours.push(attendance.totalHours);
      }
      performance[dayName].attendance++;
    });

    return days.map(day => {
      const data = performance[day];
      const averageHours = data.hours.length > 0
        ? data.hours.reduce((sum, h) => sum + h, 0) / data.hours.length
        : 0;
      const attendanceRate = data.attendance > 0 ? (data.attendance / attendances.length) * 100 : 0;

      return {
        day,
        averageHours,
        attendanceRate,
      };
    });
  }

  private async calculateComparativesStats(depotId: string, workerId: string, dateFrom: Date, dateTo: Date) {
    // Obtener estadísticas del depot (simplificado)
    const depotStats = await this.attendanceRepository.getDepotAttendanceStats(depotId, new Date());

    // Calcular ranking (simplificado - necesitaríamos más datos)
    const ranking = {
      attendanceRank: 1, // Placeholder
      hoursRank: 1, // Placeholder
      punctualityRank: 1, // Placeholder
      totalWorkers: depotStats.totalWorkers,
    };

    return {
      depotAverage: {
        attendanceRate: depotStats.presentWorkers / depotStats.totalWorkers * 100,
        averageHours: depotStats.totalHours / depotStats.completedShifts || 0,
        punctualityScore: 85, // Placeholder
      },
      ranking,
    };
  }

  private async calculateTrendsStats(workerId: string): Promise<{
    last7Days: StatsSnapshot;
    last30Days: StatsSnapshot;
    last90Days: StatsSnapshot;
  }> {
    const now = new Date();

    const last7Days = await this.getStatsSnapshot(workerId, 7, now);
    const last30Days = await this.getStatsSnapshot(workerId, 30, now);
    const last90Days = await this.getStatsSnapshot(workerId, 90, now);

    return {
      last7Days,
      last30Days,
      last90Days,
    };
  }

  private async getStatsSnapshot(workerId: string, days: number, endDate: Date): Promise<StatsSnapshot> {
    const dateFrom = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const stats = await this.attendanceRepository.getWorkerAttendanceStats(workerId, dateFrom, endDate);

    return {
      workDays: stats.completeDays + stats.incompleteDays, // Aproximación
      totalHours: stats.totalHours,
      attendanceRate: stats.totalDays > 0 ? (stats.completeDays / stats.totalDays) * 100 : 0,
      averageRiskScore: 25, // Placeholder - necesitaríamos calcular promedios de riesgo
    };
  }
}