import { Injectable } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { AntiFraudValidatorDomainService, ValidationContext } from '../../domain/services/anti-fraud-validator.domain-service';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordStatus } from '../../domain/enums/record-status.enum';
import { RecordAttendanceDto } from '../dto/record-attendance.dto';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';

@Injectable()
export class RecordExitUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly antiFraudValidator: AntiFraudValidatorDomainService,
  ) {}

  async execute(dto: RecordAttendanceDto, workerId: string): Promise<AttendanceResponseDto> {
    // 1. Validar que el worker existe y está activo
    await this.validateWorker(workerId);

    // 2. Verificar que tiene entrada del mismo día y no tiene salida
    const attendance = await this.validateHasEntryWithoutExit(workerId, dto.timestamp);

    // 3. Preparar contexto para validación anti-fraude
    const context = await this.buildValidationContext(workerId, dto);

    // 4. Ejecutar validaciones anti-fraude
    const validationResult = await this.antiFraudValidator.validateRecord(
      this.mapDtoToValidationData(dto, workerId),
      context,
    );

    // 5. Crear AttendanceRecord para la salida
    const record = await this.attendanceRepository.createAttendanceRecord({
      type: AttendanceType.EXIT,
      timestamp: new Date(dto.timestamp),
      status: validationResult.overallStatus,
      qrCodeUsed: dto.qrCodeUsed,
      photoPath: dto.photoPath,
      photoMetadata: dto.photoMetadata ? JSON.stringify(dto.photoMetadata) : null,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      accuracy: dto.location.accuracy,
      validationErrors: this.serializeValidationErrors(validationResult),
      processedAt: new Date(),
      createdOffline: dto.createdOffline || false,
      workerId,
      deviceId: dto.deviceId,
      attendanceId: attendance.id,
    });

    // 6. Actualizar Attendance con hora de salida y calcular horas totales
    const updatedAttendance = await this.attendanceRepository.updateAttendance(attendance.id, {
      exitTime: new Date(dto.timestamp),
    });

    // 7. Retornar respuesta
    return {
      success: true,
      recordId: record.id,
      attendanceId: attendance.id,
      status: validationResult.overallStatus,
      fraudScore: validationResult.fraudScore.score,
      message: this.getStatusMessage(validationResult.overallStatus, validationResult.summary),
      needsManualReview: validationResult.needsManualReview,
      validationErrors: this.mapValidationErrors(validationResult),
      shift: {
        date: updatedAttendance.date.toISOString().split('T')[0],
        entryTime: updatedAttendance.entryTime?.toISOString() || null,
        exitTime: new Date(dto.timestamp).toISOString(),
        isComplete: true,
        totalHours: updatedAttendance.totalHours || undefined,
      },
    };
  }

  private async validateWorker(workerId: string): Promise<void> {
    if (!workerId) {
      throw new Error('Worker ID is required');
    }
  }

  private async validateHasEntryWithoutExit(workerId: string, timestamp: string) {
    const recordDate = new Date(timestamp);
    recordDate.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceRepository.findAttendanceByWorkerAndDate(
      workerId,
      recordDate,
    );

    if (!attendance) {
      throw new Error('No attendance record found for today');
    }

    if (!attendance.entryTime) {
      throw new Error('Worker has no entry record for today');
    }

    if (attendance.exitTime) {
      throw new Error('Worker already has an exit record for today');
    }

    return attendance;
  }

  private async buildValidationContext(workerId: string, dto: RecordAttendanceDto): Promise<ValidationContext> {
    // Obtener último registro del worker
    const lastRecord = await this.attendanceRepository.findLastRecordByWorker(
      workerId,
      new Date(dto.timestamp),
    );

    // Obtener historial de asistencia para análisis de patrones
    const workerAttendanceHistory = await this.attendanceRepository.findAttendanceRecords(
      { workerId },
      10, // Últimos 10 registros
    );

    // Configuración del depot principal - debería venir de variables de entorno
    const depot = {
      id: process.env.DEFAULT_DEPOT_ID || 'main-depot',
      latitude: parseFloat(process.env.DEFAULT_DEPOT_LAT || '-12.0464'),
      longitude: parseFloat(process.env.DEFAULT_DEPOT_LNG || '-77.0428'),
      radius: parseInt(process.env.DEFAULT_DEPOT_RADIUS || '100'),
      secret: process.env.DEPOT_SECRET_KEY || 'default-depot-secret',
    };

    // Información del dispositivo - por defecto asumimos registrado
    const deviceInfo = {
      isRegistered: true,
      lastSeenAt: new Date(),
    };

    return {
      depot,
      lastRecord: lastRecord || undefined,
      workerAttendanceHistory,
      deviceInfo,
    };
  }

  private mapDtoToValidationData(dto: RecordAttendanceDto, workerId: string) {
    return {
      type: dto.type as AttendanceType,
      timestamp: new Date(dto.timestamp),
      qrCodeUsed: dto.qrCodeUsed,
      photoPath: dto.photoPath,
      photoMetadata: dto.photoMetadata,
      location: dto.location,
      deviceId: dto.deviceId,
      workerId,
      createdOffline: dto.createdOffline,
    };
  }

  private serializeValidationErrors(validationResult: any): string {
    const errors: any[] = [];

    // Recopilar todos los errores de validación
    Object.entries(validationResult.validationResults).forEach(([category, results]: [string, any[]]) => {
      results.forEach(result => {
        if (!result.isValid || result.isSuspicious) {
          errors.push({
            level: category,
            error: result.message,
            severity: result.severity > 25 ? 'critical' : result.severity > 10 ? 'error' : 'warning',
            reason: result.reason,
            details: result.details,
          });
        }
      });
    });

    return JSON.stringify(errors);
  }

  private getStatusMessage(status: RecordStatus, summary: string): string {
    switch (status) {
      case RecordStatus.ACCEPTED:
        return 'Salida registrada exitosamente';
      case RecordStatus.SUSPICIOUS:
        return 'Salida registrada pero requiere revisión manual';
      case RecordStatus.REJECTED:
        return 'Salida rechazada por validaciones de seguridad';
      case RecordStatus.PENDING:
        return 'Salida pendiente de procesamiento';
      default:
        return summary;
    }
  }

  private mapValidationErrors(validationResult: any) {
    const errors: any[] = [];

    Object.entries(validationResult.validationResults).forEach(([category, results]: [string, any[]]) => {
      results.forEach(result => {
        if (!result.isValid || result.isSuspicious) {
          errors.push({
            level: category,
            error: result.message,
            severity: result.severity > 25 ? 'critical' : result.severity > 10 ? 'error' : 'warning',
          });
        }
      });
    });

    return errors;
  }
}
