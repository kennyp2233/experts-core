import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';
import {
  WorkSchedule,
  WorkerScheduleAssignment,
  ScheduleException,
  EffectiveSchedule,
  ScheduleValidationResult,
  TimeWindow,
  CreateScheduleDto,
  UpdateScheduleDto,
  AssignScheduleDto,
  CreateExceptionDto,
  ExceptionReason,
} from '../../domain/types/work-schedule.types';
import { VALIDATION_MESSAGES } from '../../domain/constants/validation-messages.constants';
import { ValidationResult } from '../../domain/services/temporal-validator.domain-service';
import { FraudReason } from '../../domain/enums/fraud-reason.enum';

/**
 * Servicio para gestionar horarios de trabajo configurables
 */
@Injectable()
export class WorkScheduleService {
  private readonly logger = new Logger(WorkScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener schedule activo de un worker para una fecha específica
   */
  async getWorkerSchedule(
    workerId: string,
    date: Date = new Date(),
  ): Promise<EffectiveSchedule | null> {
    const dayOfWeek = this.getDayOfWeek(date);

    this.logger.debug(
      `Getting schedule for worker: ${workerId}, date: ${date.toISOString()}, dayOfWeek: ${dayOfWeek}`,
    );

    // Buscar assignment activo
    const assignment = await this.prisma.workerScheduleAssignment.findFirst({
      where: {
        workerId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      include: {
        schedule: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!assignment) {
      this.logger.debug(`No schedule assignment found for worker: ${workerId}`);

      // Fallback: buscar schedule por defecto del depot
      const worker = await this.prisma.worker.findUnique({
        where: { id: workerId },
        select: { depotId: true },
      });

      if (worker) {
        return this.getDepotDefaultSchedule(worker.depotId, date);
      }

      return null;
    }

    // Construir effective schedule desde assignment
    return this.buildEffectiveSchedule(assignment, date, dayOfWeek);
  }

  /**
   * Obtener schedule por defecto de un depot
   */
  private async getDepotDefaultSchedule(
    depotId: string,
    date: Date,
  ): Promise<EffectiveSchedule | null> {
    const dayOfWeek = this.getDayOfWeek(date);

    const schedule = await this.prisma.workSchedule.findFirst({
      where: {
        depotId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!schedule) {
      return null;
    }

    // Verificar que el día aplique
    const daysOfWeek = JSON.parse(schedule.daysOfWeek);
    if (!daysOfWeek.includes(dayOfWeek)) {
      return null;
    }

    // Buscar excepción
    const exception = await this.getScheduleException(schedule.id, date);

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      entryWindow: {
        start: exception?.entryStart || schedule.entryStart,
        end: exception?.entryEnd || schedule.entryEnd,
      },
      exitWindow: {
        start: exception?.exitStart || schedule.exitStart,
        end: exception?.exitEnd || schedule.exitEnd,
      },
      entryToleranceMinutes: schedule.entryToleranceMinutes,
      exitToleranceMinutes: schedule.exitToleranceMinutes,
      daysOfWeek,
      timezone: schedule.timezone,
      isStrict: schedule.isStrict,
      source: {
        baseSchedule: true,
        hasWorkerOverrides: false,
        hasException: !!exception,
        exceptionReason: exception?.reason as ExceptionReason,
      },
    };
  }

  /**
   * Construir effective schedule desde assignment
   */
  private async buildEffectiveSchedule(
    assignment: WorkerScheduleAssignment & { schedule: any },
    date: Date,
    dayOfWeek: number,
  ): Promise<EffectiveSchedule | null> {
    const schedule = assignment.schedule;

    // Verificar días aplicables (con override)
    const daysOfWeek = assignment.customDaysOfWeek
      ? JSON.parse(assignment.customDaysOfWeek)
      : JSON.parse(schedule.daysOfWeek);

    if (!daysOfWeek.includes(dayOfWeek)) {
      this.logger.debug(`Day ${dayOfWeek} not in schedule days: ${daysOfWeek.join(',')}`);
      return null;
    }

    // Buscar excepción
    const exception = await this.getScheduleException(schedule.id, date);

    if (exception && !exception.isWorkingDay) {
      this.logger.debug(`Exception found: ${exception.reason}, not a working day`);
      return null;
    }

    // Aplicar overrides y excepciones
    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      entryWindow: {
        start: exception?.entryStart || assignment.customEntryStart || schedule.entryStart,
        end: exception?.entryEnd || assignment.customEntryEnd || schedule.entryEnd,
      },
      exitWindow: {
        start: exception?.exitStart || assignment.customExitStart || schedule.exitStart,
        end: exception?.exitEnd || assignment.customExitEnd || schedule.exitEnd,
      },
      entryToleranceMinutes:
        assignment.customEntryTolerance ?? schedule.entryToleranceMinutes,
      exitToleranceMinutes:
        assignment.customExitTolerance ?? schedule.exitToleranceMinutes,
      daysOfWeek,
      timezone: schedule.timezone,
      isStrict: schedule.isStrict,
      source: {
        baseSchedule: true,
        hasWorkerOverrides: !!(
          assignment.customEntryStart ||
          assignment.customExitStart
        ),
        hasException: !!exception,
        exceptionReason: exception?.reason as ExceptionReason,
      },
    };
  }

  /**
   * Obtener excepción de schedule para una fecha
   */
  private async getScheduleException(
    scheduleId: string,
    date: Date,
  ): Promise<ScheduleException | null> {
    const dateOnly = this.getDateOnly(date);

    const exception = await this.prisma.scheduleException.findUnique({
      where: {
        scheduleId_date: {
          scheduleId,
          date: dateOnly,
        },
      },
    });

    return exception as ScheduleException | null;
  }

  /**
   * Validar si un timestamp está dentro del horario permitido
   */
  async validateWorkingHours(
    recordTime: Date,
    workerId: string,
    isEntry: boolean,
  ): Promise<ValidationResult> {
    const effectiveSchedule = await this.getWorkerSchedule(workerId, recordTime);

    if (!effectiveSchedule) {
      // No hay horario configurado
      return {
        isValid: true,
        isSuspicious: false,
        severity: 0,
        message: VALIDATION_MESSAGES.TEMPORAL.NO_SCHEDULE_CONFIGURED(),
      };
    }

    const window = isEntry ? effectiveSchedule.entryWindow : effectiveSchedule.exitWindow;
    const tolerance = isEntry
      ? effectiveSchedule.entryToleranceMinutes
      : effectiveSchedule.exitToleranceMinutes;

    // Convertir a timezone del schedule
    const localTime = this.convertToTimezone(recordTime, effectiveSchedule.timezone);
    const timeString = this.formatTime(localTime);

    const isWithinWindow = this.isTimeInWindow(timeString, window.start, window.end, tolerance);

    if (!isWithinWindow) {
      const outsideBy = this.calculateOutsideMinutes(timeString, window.start, window.end);

      if (effectiveSchedule.isStrict) {
        // Modo estricto: rechazar
        return {
          isValid: false,
          isSuspicious: false,
          reason: FraudReason.UNUSUAL_WORK_HOURS,
          message: VALIDATION_MESSAGES.TEMPORAL.OUTSIDE_SCHEDULE_STRICT(
            timeString,
            `${window.start}-${window.end}`,
          ),
          severity: 30,
          details: {
            recordTime: timeString,
            expectedWindow: window,
            tolerance,
            isStrict: true,
            outsideBy,
            timezone: effectiveSchedule.timezone,
          },
        };
      } else {
        // Modo flexible: marcar sospechoso
        return {
          isValid: true,
          isSuspicious: true,
          reason: FraudReason.UNUSUAL_WORK_HOURS,
          message: VALIDATION_MESSAGES.TEMPORAL.OUTSIDE_SCHEDULE_FLEXIBLE(
            timeString,
            `${window.start}-${window.end}`,
          ),
          severity: 10,
          details: {
            recordTime: timeString,
            expectedWindow: window,
            tolerance,
            outsideBy,
            timezone: effectiveSchedule.timezone,
          },
        };
      }
    }

    return {
      isValid: true,
      isSuspicious: false,
      severity: 0,
      message: VALIDATION_MESSAGES.TEMPORAL.WITHIN_SCHEDULE(),
      details: {
        recordTime: timeString,
        expectedWindow: window,
        timezone: effectiveSchedule.timezone,
      },
    };
  }

  /**
   * CRUD Operations
   */

  async createSchedule(dto: CreateScheduleDto): Promise<WorkSchedule> {
    const schedule = await this.prisma.workSchedule.create({
      data: {
        name: dto.name,
        description: dto.description,
        entryStart: dto.entryStart,
        entryEnd: dto.entryEnd,
        exitStart: dto.exitStart,
        exitEnd: dto.exitEnd,
        entryToleranceMinutes: dto.entryToleranceMinutes ?? 15,
        exitToleranceMinutes: dto.exitToleranceMinutes ?? 15,
        daysOfWeek: JSON.stringify(dto.daysOfWeek),
        timezone: dto.timezone ?? 'America/Guayaquil',
        isStrict: dto.isStrict ?? false,
        depotId: dto.depotId,
      },
    });

    return schedule as WorkSchedule;
  }

  async updateSchedule(scheduleId: string, dto: UpdateScheduleDto): Promise<WorkSchedule> {
    const schedule = await this.prisma.workSchedule.update({
      where: { id: scheduleId },
      data: {
        name: dto.name,
        description: dto.description,
        entryStart: dto.entryStart,
        entryEnd: dto.entryEnd,
        exitStart: dto.exitStart,
        exitEnd: dto.exitEnd,
        entryToleranceMinutes: dto.entryToleranceMinutes,
        exitToleranceMinutes: dto.exitToleranceMinutes,
        daysOfWeek: dto.daysOfWeek ? JSON.stringify(dto.daysOfWeek) : undefined,
        timezone: dto.timezone,
        isStrict: dto.isStrict,
        isActive: dto.isActive,
      },
    });

    return schedule as WorkSchedule;
  }

  async getSchedule(scheduleId: string): Promise<WorkSchedule> {
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule not found: ${scheduleId}`);
    }

    return schedule as WorkSchedule;
  }

  async listDepotSchedules(depotId: string): Promise<WorkSchedule[]> {
    const schedules = await this.prisma.workSchedule.findMany({
      where: { depotId },
      orderBy: { name: 'asc' },
    });

    return schedules as WorkSchedule[];
  }

  async assignScheduleToWorker(dto: AssignScheduleDto): Promise<WorkerScheduleAssignment> {
    const assignment = await this.prisma.workerScheduleAssignment.create({
      data: {
        workerId: dto.workerId,
        scheduleId: dto.scheduleId,
        customEntryStart: dto.customEntryStart,
        customEntryEnd: dto.customEntryEnd,
        customExitStart: dto.customExitStart,
        customExitEnd: dto.customExitEnd,
        customEntryTolerance: dto.customEntryTolerance,
        customExitTolerance: dto.customExitTolerance,
        customDaysOfWeek: dto.customDaysOfWeek ? JSON.stringify(dto.customDaysOfWeek) : null,
        effectiveFrom: dto.effectiveFrom ?? new Date(),
        effectiveTo: dto.effectiveTo,
        notes: dto.notes,
      },
      include: {
        schedule: true,
      },
    });

    return assignment as WorkerScheduleAssignment;
  }

  async createException(dto: CreateExceptionDto): Promise<ScheduleException> {
    const exception = await this.prisma.scheduleException.create({
      data: {
        scheduleId: dto.scheduleId,
        date: this.getDateOnly(dto.date),
        reason: dto.reason,
        entryStart: dto.entryStart,
        entryEnd: dto.entryEnd,
        exitStart: dto.exitStart,
        exitEnd: dto.exitEnd,
        isWorkingDay: dto.isWorkingDay ?? true,
        description: dto.description,
      },
    });

    return exception as ScheduleException;
  }

  /**
   * Helpers
   */

  private getDayOfWeek(date: Date): number {
    // JavaScript: 0=Dom, 1=Lun, ..., 6=Sáb
    // Queremos: 1=Lun, ..., 7=Dom
    const jsDay = date.getDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  private getDateOnly(date: Date): Date {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly;
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private convertToTimezone(date: Date, timezone: string): Date {
    // Simplificado: usar offset hardcoded para Guayaquil (UTC-5)
    // En producción, usar librería como date-fns-tz o luxon
    if (timezone === 'America/Guayaquil') {
      const offset = -5 * 60; // -5 horas en minutos
      return new Date(date.getTime() + offset * 60 * 1000);
    }

    return date;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isTimeInWindow(
    time: string,
    start: string,
    end: string,
    tolerance: number,
  ): boolean {
    let timeMinutes = this.timeToMinutes(time);
    let startMinutes = this.timeToMinutes(start) - tolerance;
    let endMinutes = this.timeToMinutes(end) + tolerance;

    // Manejar cruce de medianoche (ej: 22:00 - 06:00)
    if (endMinutes < startMinutes) {
      // Ventana cruza medianoche
      endMinutes += 24 * 60;

      // Si time es antes de medianoche, sumar 24h
      if (timeMinutes < startMinutes) {
        timeMinutes += 24 * 60;
      }
    }

    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  private calculateOutsideMinutes(time: string, start: string, end: string): number {
    const timeMinutes = this.timeToMinutes(time);
    let startMinutes = this.timeToMinutes(start);
    let endMinutes = this.timeToMinutes(end);

    // Manejar cruce de medianoche
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    if (timeMinutes < startMinutes) {
      return startMinutes - timeMinutes;
    } else if (timeMinutes > endMinutes) {
      return timeMinutes - endMinutes;
    }

    return 0;
  }
}
