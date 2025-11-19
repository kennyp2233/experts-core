import { Injectable } from '@nestjs/common';
import { WorkShift } from '../value-objects/work-shift.vo';
import { AttendanceEntity } from '../entities/attendance.entity';
import { BreakPolicyService } from '../../infrastructure/services/break-policy.service';
import { BreakCalculationResult } from '../types/break-policy.types';

export interface WorkHoursCalculation {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightShiftHours: number;
  isOvernightShift: boolean;
  breakDeductions: number;
  netWorkHours: number;
  breakCalculation?: BreakCalculationResult; // Detalle del cálculo de breaks
}

export interface WorkPattern {
  averageEntryTime: Date | null;
  averageExitTime: Date | null;
  averageDailyHours: number;
  mostCommonShiftDuration: number;
  hasConsistentPattern: boolean;
  irregularityScore: number; // 0-100, higher = more irregular
}

@Injectable()
export class WorkHoursCalculatorDomainService {
  private readonly REGULAR_HOURS_LIMIT = 8;
  private readonly NIGHT_SHIFT_START = 22; // 10 PM
  private readonly NIGHT_SHIFT_END = 6; // 6 AM

  constructor(private readonly breakPolicyService: BreakPolicyService) {}

  /**
   * Calcular horas trabajadas con detalles completos (NUEVO: con breaks configurables)
   * @param workShift - WorkShift value object
   * @param depotId - ID del depot (para cascading configuration)
   * @param workerId - ID del trabajador (para cascading configuration)
   */
  async calculateDetailedWorkHours(
    workShift: WorkShift,
    depotId?: string,
    workerId?: string,
  ): Promise<WorkHoursCalculation> {
    if (!workShift.isComplete) {
      return {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        nightShiftHours: 0,
        isOvernightShift: false,
        breakDeductions: 0,
        netWorkHours: 0,
      };
    }

    const totalHours = workShift.totalHours!;
    const entryTime = workShift.entryTime!;
    const exitTime = workShift.exitTime!;

    // Determinar si es turno nocturno
    const isOvernightShift = this.isOvernightShift(entryTime, exitTime);

    // Calcular horas nocturnas
    const nightShiftHours = this.calculateNightShiftHours(entryTime, exitTime);

    // Calcular horas regulares y extras
    const regularHours = Math.min(totalHours, this.REGULAR_HOURS_LIMIT);
    const overtimeHours = Math.max(0, totalHours - this.REGULAR_HOURS_LIMIT);

    // Calcular deducciones por break usando política configurable
    const breakCalculation = await this.breakPolicyService.calculateBreaks(
      totalHours,
      depotId,
      workerId,
    );
    const breakDeductions = breakCalculation.totalBreakHours;

    // Calcular horas netas
    const netWorkHours = totalHours - breakDeductions;

    return {
      totalHours,
      regularHours,
      overtimeHours,
      nightShiftHours,
      isOvernightShift,
      breakDeductions,
      netWorkHours,
      breakCalculation, // Incluir detalle del cálculo
    };
  }

  /**
   * Calcular horas trabajadas simple (para compatibilidad)
   */
  calculateSimpleWorkHours(entryTime: Date, exitTime: Date): number {
    let diffMs = exitTime.getTime() - entryTime.getTime();
    
    // Manejar turnos nocturnos
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000; // Agregar 24 horas
    }

    return diffMs / (1000 * 60 * 60); // Convertir a horas
  }

  /**
   * Analizar patrón de trabajo de un trabajador
   */
  analyzeWorkPattern(attendances: AttendanceEntity[]): WorkPattern {
    const completeAttendances = attendances.filter(a => a.isComplete);
    
    if (completeAttendances.length === 0) {
      return {
        averageEntryTime: null,
        averageExitTime: null,
        averageDailyHours: 0,
        mostCommonShiftDuration: 0,
        hasConsistentPattern: false,
        irregularityScore: 100,
      };
    }

    // Calcular promedios
    const entryTimes = completeAttendances.map(a => a.entryTime!);
    const exitTimes = completeAttendances.map(a => a.exitTime!);
    const dailyHours = completeAttendances.map(a => a.totalHours!);

    const averageEntryTime = this.calculateAverageTime(entryTimes);
    const averageExitTime = this.calculateAverageTime(exitTimes);
    const averageDailyHours = dailyHours.reduce((sum, hours) => sum + hours, 0) / dailyHours.length;

    // Encontrar duración más común
    const mostCommonShiftDuration = this.findMostCommonDuration(dailyHours);

    // Calcular consistencia del patrón
    const irregularityScore = this.calculateIrregularityScore(entryTimes, exitTimes, dailyHours);
    const hasConsistentPattern = irregularityScore < 30;

    return {
      averageEntryTime,
      averageExitTime,
      averageDailyHours,
      mostCommonShiftDuration,
      hasConsistentPattern,
      irregularityScore,
    };
  }

  /**
   * Validar si las horas trabajadas son razonables
   */
  validateWorkHours(workShift: WorkShift): {
    isValid: boolean;
    issues: string[];
    severity: number;
  } {
    const issues: string[] = [];
    let severity = 0;

    if (!workShift.isComplete) {
      return { isValid: true, issues: [], severity: 0 };
    }

    const totalHours = workShift.totalHours!;

    // Validar duración mínima
    if (totalHours < 1) {
      issues.push(`Very short shift: ${totalHours.toFixed(2)} hours`);
      severity += 15;
    }

    // Validar duración máxima
    if (totalHours > 16) {
      issues.push(`Extremely long shift: ${totalHours.toFixed(2)} hours`);
      severity += 25;
    } else if (totalHours > 12) {
      issues.push(`Long shift: ${totalHours.toFixed(2)} hours`);
      severity += 10;
    }

    // Validar horarios razonables
    if (!workShift.hasNormalEntryTime()) {
      issues.push('Entry time outside normal hours');
      severity += 8;
    }

    if (!workShift.hasNormalExitTime()) {
      issues.push('Exit time outside normal hours');
      severity += 8;
    }

    return {
      isValid: severity < 20,
      issues,
      severity,
    };
  }

  /**
   * Detectar turnos incompletos o sospechosos
   */
  detectIncompleteShifts(attendances: AttendanceEntity[]): AttendanceEntity[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return attendances.filter(attendance => {
      // Excluir el día actual (puede estar en progreso)
      const attendanceDate = new Date(attendance.date);
      attendanceDate.setHours(0, 0, 0, 0);
      
      if (attendanceDate.getTime() >= today.getTime()) {
        return false;
      }

      // Incluir turnos incompletos de días anteriores
      return attendance.isIncomplete();
    });
  }

  /**
   * Determinar si es turno nocturno
   */
  private isOvernightShift(entryTime: Date, exitTime: Date): boolean {
    const entryHour = entryTime.getHours();
    const exitHour = exitTime.getHours();

    // Si exit es antes que entry, definitivamente es turno nocturno
    if (exitTime <= entryTime) {
      return true;
    }

    // Si entry es tarde en la noche o exit es temprano en la mañana
    return entryHour >= this.NIGHT_SHIFT_START || exitHour <= this.NIGHT_SHIFT_END;
  }

  /**
   * Calcular horas nocturnas
   */
  private calculateNightShiftHours(entryTime: Date, exitTime: Date): number {
    if (!this.isOvernightShift(entryTime, exitTime)) {
      return 0;
    }

    let nightHours = 0;
    const currentTime = new Date(entryTime);
    const endTime = new Date(exitTime);

    // Si es turno nocturno que cruza medianoche
    if (endTime <= entryTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    while (currentTime < endTime) {
      const hour = currentTime.getHours();
      
      if (hour >= this.NIGHT_SHIFT_START || hour < this.NIGHT_SHIFT_END) {
        nightHours += 1;
      }
      
      currentTime.setHours(currentTime.getHours() + 1);
    }

    return nightHours;
  }

  /**
   * Calcular deducciones por breaks (DEPRECATED - solo para backward compatibility)
   * @deprecated Use BreakPolicyService.calculateBreaks() instead para breaks configurables
   *
   * Este método usa valores hardcodeados:
   * - Si totalHours >= 6: deduce 30 minutos (0.5 horas)
   * - Caso contrario: no deduce nada
   *
   * Mantener solo para compatibilidad con código legacy que no pasa depotId/workerId
   */
  private calculateBreakDeductions(totalHours: number): number {
    // Valores hardcoded (normativa laboral Ecuador básica)
    const BREAK_DEDUCTION_THRESHOLD = 6; // hours
    const STANDARD_BREAK_MINUTES = 30;

    if (totalHours >= BREAK_DEDUCTION_THRESHOLD) {
      return STANDARD_BREAK_MINUTES / 60; // Convertir a horas
    }
    return 0;
  }

  /**
   * Calcular tiempo promedio
   */
  private calculateAverageTime(times: Date[]): Date | null {
    if (times.length === 0) return null;

    // Convertir a minutos desde medianoche
    const minutesArray = times.map(time => time.getHours() * 60 + time.getMinutes());
    
    // Manejar el caso de horarios que cruzan medianoche
    const adjustedMinutes = this.adjustForMidnightCrossing(minutesArray);
    
    const averageMinutes = adjustedMinutes.reduce((sum, min) => sum + min, 0) / adjustedMinutes.length;
    
    // Convertir de vuelta a Date
    const avgDate = new Date();
    avgDate.setHours(Math.floor(averageMinutes / 60), averageMinutes % 60, 0, 0);
    
    return avgDate;
  }

  /**
   * Ajustar horarios que cruzan medianoche
   */
  private adjustForMidnightCrossing(minutes: number[]): number[] {
    // Si la variación es muy grande, probablemente cruza medianoche
    const min = Math.min(...minutes);
    const max = Math.max(...minutes);
    
    if (max - min > 12 * 60) { // Más de 12 horas de diferencia
      return minutes.map(m => m < 12 * 60 ? m + 24 * 60 : m); // Agregar 24h a horarios tempranos
    }
    
    return minutes;
  }

  /**
   * Encontrar duración más común
   */
  private findMostCommonDuration(hours: number[]): number {
    // Redondear a la hora más cercana para agrupación
    const roundedHours = hours.map(h => Math.round(h));
    
    // Contar frecuencias
    const frequencies = new Map<number, number>();
    roundedHours.forEach(h => {
      frequencies.set(h, (frequencies.get(h) || 0) + 1);
    });
    
    // Encontrar el más común
    let mostCommon = 0;
    let maxCount = 0;
    
    frequencies.forEach((count, duration) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = duration;
      }
    });
    
    return mostCommon;
  }

  /**
   * Calcular puntuación de irregularidad
   */
  private calculateIrregularityScore(entryTimes: Date[], exitTimes: Date[], dailyHours: number[]): number {
    let score = 0;

    // Calcular variación en horarios de entrada
    const entryVariation = this.calculateTimeVariation(entryTimes);
    score += Math.min(entryVariation / 60, 30); // Max 30 puntos por variación de entrada

    // Calcular variación en horarios de salida
    const exitVariation = this.calculateTimeVariation(exitTimes);
    score += Math.min(exitVariation / 60, 30); // Max 30 puntos por variación de salida

    // Calcular variación en horas diarias
    const avgHours = dailyHours.reduce((sum, h) => sum + h, 0) / dailyHours.length;
    const hoursVariation = dailyHours.reduce((sum, h) => sum + Math.abs(h - avgHours), 0) / dailyHours.length;
    score += Math.min(hoursVariation * 10, 40); // Max 40 puntos por variación de horas

    return Math.min(score, 100);
  }

  /**
   * Calcular variación en tiempos (en minutos)
   */
  private calculateTimeVariation(times: Date[]): number {
    if (times.length <= 1) return 0;

    const minutes = times.map(t => t.getHours() * 60 + t.getMinutes());
    const adjustedMinutes = this.adjustForMidnightCrossing(minutes);
    
    const avg = adjustedMinutes.reduce((sum, m) => sum + m, 0) / adjustedMinutes.length;
    const variance = adjustedMinutes.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / adjustedMinutes.length;
    
    return Math.sqrt(variance); // Desviación estándar en minutos
  }
}
