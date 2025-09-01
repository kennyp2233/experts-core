import { Injectable } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { AntiFraudValidatorDomainService, ValidationContext } from '../../domain/services/anti-fraud-validator.domain-service';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordStatus } from '../../domain/enums/record-status.enum';
import { RecordAttendanceDto } from '../dto/record-attendance.dto';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { PrismaService } from '../../../../prisma.service';
import { PhotoStorageService } from '../../infrastructure/services/photo-storage.service';

@Injectable()
export class AttendanceProcessingService {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly antiFraudValidator: AntiFraudValidatorDomainService,
    private readonly prisma: PrismaService,
    private readonly photoStorageService: PhotoStorageService,
  ) {}

  async processAttendanceRecord(
    dto: RecordAttendanceDto,
    workerId: string,
    depotId: string,
    type: AttendanceType,
  ): Promise<AttendanceResponseDto> {
    // 1. Validar worker
    this.validateWorker(workerId);

    // 2. Preparar contexto para validación
    const context = await this.buildValidationContext(workerId, dto, depotId);

    // 3. Ejecutar validaciones anti-fraude
    const validationResult = await this.antiFraudValidator.validateRecord(
      this.mapDtoToValidationData(dto, workerId, type),
      context,
    );

    // 4. Procesar y guardar imagen
    let finalPhotoPath: string;
    try {
      finalPhotoPath = await this.photoStorageService.processAndSavePhoto(dto.photo, workerId);
    } catch (error) {
      throw new Error(`Failed to process photo: ${error.message}`);
    }

    // 5. Obtener información real de la imagen si no viene en metadata
    if (!dto.photoMetadata) {
      const imageInfo = this.photoStorageService.getImageInfo(dto.photo);
      dto.photoMetadata = {
        timestamp: new Date().toISOString(),
        hasCameraInfo: false, // No podemos detectar esto desde Base64
        fileSize: imageInfo.size,
        dimensions: undefined, // Se podría agregar librería para detectar dimensiones
      };
    }

    // 6. Manejar attendance según el tipo
    const attendance = await this.handleAttendanceByType(
      workerId,
      dto.timestamp,
      depotId,
      type,
    );

    // 7. Crear registro de attendance
    const record = await this.createAttendanceRecord(
      dto,
      finalPhotoPath,
      workerId,
      type,
      validationResult,
      attendance.id,
    );

    // 8. Actualizar attendance con los tiempos correspondientes
    const updatedAttendance = await this.updateAttendanceTime(
      attendance.id,
      dto.timestamp,
      type,
    );

    // 7. Construir respuesta
    return this.buildResponse(
      record,
      updatedAttendance,
      validationResult,
      type,
      dto.timestamp,
    );
  }

  private validateWorker(workerId: string): void {
    if (!workerId) {
      throw new Error('Worker ID is required');
    }
  }

  private async handleAttendanceByType(
    workerId: string,
    timestamp: string,
    depotId: string,
    type: AttendanceType,
  ) {
    if (type === AttendanceType.ENTRY) {
      return this.handleAttendanceForEntry(workerId, timestamp, depotId);
    } else {
      return this.handleAttendanceForExit(workerId, timestamp, depotId);
    }
  }

  private async handleAttendanceForEntry(workerId: string, timestamp: string, depotId: string) {
    const recordDate = new Date(timestamp);
    recordDate.setHours(0, 0, 0, 0);

    const existingAttendance = await this.attendanceRepository.findAttendanceByWorkerAndDate(
      workerId,
      recordDate,
    );

    if (!existingAttendance) {
      // Caso 1: No hay attendance del día -> Crear nuevo
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        workerId,
        depotId,
      });
    }

    if (existingAttendance.entryTime && !existingAttendance.exitTime) {
      // Caso 2: Hay entrada sin salida -> Cerrar automáticamente el turno anterior
      await this.attendanceRepository.updateAttendance(existingAttendance.id, {
        exitTime: new Date(timestamp), // Cierra con la hora de la nueva entrada
      });

      // Crear nuevo attendance para la nueva entrada
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        workerId,
        depotId,
      });
    }

    if (existingAttendance.entryTime && existingAttendance.exitTime) {
      // Caso 3: Turno completo -> Crear nuevo attendance
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        workerId,
        depotId,
      });
    }

    // Caso 4: Solo hay salida (edge case) -> Usar el mismo attendance
    return existingAttendance;
  }

  private async handleAttendanceForExit(workerId: string, timestamp: string, depotId: string) {
    const recordDate = new Date(timestamp);
    recordDate.setHours(0, 0, 0, 0);

    const existingAttendance = await this.attendanceRepository.findAttendanceByWorkerAndDate(
      workerId,
      recordDate,
    );

    if (!existingAttendance) {
      // Caso 1: No hay attendance -> Crear con solo salida
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        exitTime: new Date(timestamp),
        workerId,
        depotId,
      });
    }

    if (existingAttendance.entryTime && !existingAttendance.exitTime) {
      // Caso 2: Hay entrada sin salida -> Cerrar normalmente
      return existingAttendance;
    }

    if (existingAttendance.entryTime && existingAttendance.exitTime) {
      // Caso 3: Turno ya completo -> Crear nuevo attendance con solo salida
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        exitTime: new Date(timestamp),
        workerId,
        depotId,
      });
    }

    if (!existingAttendance.entryTime && !existingAttendance.exitTime) {
      // Caso 4: Attendance vacío -> Usar el mismo
      return existingAttendance;
    }

    return existingAttendance;
  }

  private async buildValidationContext(workerId: string, dto: RecordAttendanceDto, depotId: string): Promise<ValidationContext> {
    // 1. Obtener datos reales del depot desde la base de datos
    const depot = await this.prisma.depot.findUnique({
      where: { id: depotId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        radius: true,
        secret: true,
        isActive: true
      }
    });

    if (!depot) {
      throw new Error(`Depot with ID ${depotId} not found`);
    }

    if (!depot.isActive) {
      throw new Error(`Depot ${depotId} is not active`);
    }

    // 2. Obtener último registro del worker
    const lastRecord = await this.attendanceRepository.findLastRecordByWorker(
      workerId,
      new Date(dto.timestamp),
    );

    // 3. Obtener historial de asistencia para análisis de patrones
    const workerAttendanceHistory = await this.attendanceRepository.findAttendanceRecords(
      { workerId },
      10, // Últimos 10 registros
    );

    // 4. Información del dispositivo - por defecto asumimos registrado
    const deviceInfo = {
      isRegistered: true,
      lastSeenAt: new Date(),
    };

    return {
      depot: {
        id: depot.id,
        latitude: depot.latitude,
        longitude: depot.longitude,
        radius: depot.radius,
        secret: depot.secret,
      },
      lastRecord: lastRecord || undefined,
      workerAttendanceHistory,
      deviceInfo,
    };
  }

  private mapDtoToValidationData(dto: RecordAttendanceDto, workerId: string, type: AttendanceType) {
    return {
      type,
      timestamp: new Date(dto.timestamp),
      qrCodeUsed: dto.qrCodeUsed,
      photoPath: dto.photo, // Usar dto.photo para validaciones (pero se procesará después)
      photoMetadata: dto.photoMetadata,
      location: dto.location,
      deviceId: dto.deviceId,
      workerId,
      createdOffline: dto.createdOffline,
    };
  }

  private async createAttendanceRecord(
    dto: RecordAttendanceDto,
    photoPath: string,
    workerId: string,
    type: AttendanceType,
    validationResult: any,
    attendanceId: string,
  ) {
    return await this.attendanceRepository.createAttendanceRecord({
      type,
      timestamp: new Date(dto.timestamp),
      status: validationResult.overallStatus,
      qrCodeUsed: dto.qrCodeUsed,
      photoPath: photoPath,
      photoMetadata: dto.photoMetadata ? JSON.stringify(dto.photoMetadata) : null,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      accuracy: dto.location.accuracy,
      validationErrors: this.serializeValidationErrors(validationResult),
      processedAt: new Date(),
      createdOffline: dto.createdOffline || false,
      workerId,
      deviceId: dto.deviceId,
      attendanceId,
    });
  }

  private async updateAttendanceTime(attendanceId: string, timestamp: string, type: AttendanceType) {
    if (type === AttendanceType.ENTRY) {
      return await this.attendanceRepository.updateAttendance(attendanceId, {
        entryTime: new Date(timestamp),
      });
    } else {
      return await this.attendanceRepository.updateAttendance(attendanceId, {
        exitTime: new Date(timestamp),
      });
    }
  }

  private buildResponse(
    record: any,
    attendance: any,
    validationResult: any,
    type: AttendanceType,
    timestamp: string,
  ): AttendanceResponseDto {
    const isComplete = attendance.entryTime && attendance.exitTime;
    
    return {
      success: true,
      recordId: record.id,
      attendanceId: attendance.id,
      status: validationResult.overallStatus,
      fraudScore: validationResult.fraudScore.score,
      message: this.getStatusMessage(validationResult.overallStatus, validationResult.summary, type),
      needsManualReview: validationResult.needsManualReview,
      validationErrors: this.mapValidationErrors(validationResult),
      shift: {
        date: attendance.date.toISOString().split('T')[0],
        entryTime: attendance.entryTime?.toISOString() || null,
        exitTime: attendance.exitTime?.toISOString() || null,
        isComplete,
        totalHours: attendance.totalHours || undefined,
      },
    };
  }

  private serializeValidationErrors(validationResult: any): string {
    const errors: any[] = [];

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

  private getStatusMessage(status: RecordStatus, summary: string, type: AttendanceType): string {
    const actionText = type === AttendanceType.ENTRY ? 'Entrada' : 'Salida';
    
    switch (status) {
      case RecordStatus.ACCEPTED:
        return `${actionText} registrada exitosamente`;
      case RecordStatus.SUSPICIOUS:
        return `${actionText} registrada pero requiere revisión manual`;
      case RecordStatus.REJECTED:
        return `${actionText} rechazada por validaciones de seguridad`;
      case RecordStatus.PENDING:
        return `${actionText} pendiente de procesamiento`;
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
