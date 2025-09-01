import { Injectable } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { AntiFraudValidatorDomainService, ValidationContext } from '../../domain/services/anti-fraud-validator.domain-service';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordStatus } from '../../domain/enums/record-status.enum';
import { RecordAttendanceDto } from '../dto/record-attendance.dto';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { GPSCoordinate } from '../../domain/value-objects/gps-coordinate.vo';
import { PhotoMetadata } from '../../domain/value-objects/photo-metadata.vo';

@Injectable()
export class RecordEntryUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly antiFraudValidator: AntiFraudValidatorDomainService,
  ) {}

  async execute(dto: RecordAttendanceDto, workerId: string): Promise<AttendanceResponseDto> {
    // 1. Validar que el worker existe y está activo
    await this.validateWorker(workerId);

    // 2. Verificar que no tiene entrada activa del mismo día
    await this.validateNoActiveEntry(workerId, dto.timestamp);

    // 3. Preparar contexto para validación anti-fraude
    const context = await this.buildValidationContext(workerId, dto);

    // 4. Ejecutar validaciones anti-fraude
    const validationResult = await this.antiFraudValidator.validateRecord(
      this.mapDtoToValidationData(dto, workerId),
      context,
    );

    // 5. Buscar o crear Attendance para la fecha
    const attendance = await this.findOrCreateDailyAttendance(workerId, dto.timestamp, context.depot.id);

    // 6. Crear AttendanceRecord
    const record = await this.attendanceRepository.createAttendanceRecord({
      type: AttendanceType.ENTRY,
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

    // 7. Actualizar Attendance con hora de entrada
    await this.attendanceRepository.updateAttendance(attendance.id, {
      entryTime: new Date(dto.timestamp),
    });

    // 8. Retornar respuesta
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
        date: attendance.date.toISOString().split('T')[0],
        entryTime: new Date(dto.timestamp).toISOString(),
        exitTime: null,
        isComplete: false,
      },
    };
  }

  private async validateWorker(workerId: string): Promise<void> {
    // Esta validación se haría normalmente con un Worker repository
    // Por ahora asumimos que el worker existe si llegó hasta aquí
    if (!workerId) {
      throw new Error('Worker ID is required');
    }
  }

  private async validateNoActiveEntry(workerId: string, timestamp: string): Promise<void> {
    const recordDate = new Date(timestamp);
    recordDate.setHours(0, 0, 0, 0);

    const existingAttendance = await this.attendanceRepository.findAttendanceByWorkerAndDate(
      workerId,
      recordDate,
    );

    if (existingAttendance && existingAttendance.entryTime) {
      throw new Error('Worker already has an entry record for today');
    }
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

  private async findOrCreateDailyAttendance(workerId: string, timestamp: string, depotId: string) {
    const recordDate = new Date(timestamp);
    recordDate.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findAttendanceByWorkerAndDate(
      workerId,
      recordDate,
    );

    if (!attendance) {
      attendance = await this.attendanceRepository.createAttendance({
        date: recordDate,
        workerId,
        depotId,
      });
    }

    return attendance;
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
        return 'Entrada registrada exitosamente';
      case RecordStatus.SUSPICIOUS:
        return 'Entrada registrada pero requiere revisión manual';
      case RecordStatus.REJECTED:
        return 'Entrada rechazada por validaciones de seguridad';
      case RecordStatus.PENDING:
        return 'Entrada pendiente de procesamiento';
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
