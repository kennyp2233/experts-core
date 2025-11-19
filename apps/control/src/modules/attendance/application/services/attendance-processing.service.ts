import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { AntiFraudValidatorDomainService, ValidationContext } from '../../domain/services/anti-fraud-validator.domain-service';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordStatus } from '../../domain/enums/record-status.enum';
import { RecordAttendanceDto } from '../dto/record-attendance.dto';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { PrismaService } from '../../../../prisma.service';
import { PhotoStorageService } from '../../infrastructure/services/photo-storage.service';
import { ExceptionCodeService } from '../../../exception-codes/application/services/exception-code.service';

@Injectable()
export class AttendanceProcessingService {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly antiFraudValidator: AntiFraudValidatorDomainService,
    private readonly prisma: PrismaService,
    private readonly photoStorageService: PhotoStorageService,
    @Inject(forwardRef(() => ExceptionCodeService))
    private readonly exceptionCodeService: ExceptionCodeService,
  ) {}

  async processAttendanceRecord(
    dto: RecordAttendanceDto,
    workerId: string,
    depotId: string,
    deviceId: string,
    type: AttendanceType,
  ): Promise<AttendanceResponseDto> {
    console.log('[AttendanceProcessingService] 🔄 Iniciando procesamiento de attendance record');
    console.log('[AttendanceProcessingService] Datos de entrada:', {
      workerId,
      depotId,
      deviceId,
      type,
      timestamp: dto.timestamp,
      photoSize: dto.photo?.length || 0,
      location: dto.location
    });

    // 1. Validar worker
    console.log('[AttendanceProcessingService] Paso 1: Validando worker...');
    this.validateWorker(workerId);
    console.log('[AttendanceProcessingService] ✅ Worker válido');

    // 2. Validar código de excepción si se proporcionó
    console.log('[AttendanceProcessingService] Paso 2: Validando código de excepción...');
    let exceptionCodeValidation: { isValid: boolean; workerId?: string; error?: string } | null = null;
    
    if (dto.exceptionCode) {
      console.log('[AttendanceProcessingService] Validando código de excepción:', dto.exceptionCode);
      
      const validationResult = await this.exceptionCodeService.validateExceptionCode({
        code: dto.exceptionCode
      });
      
      exceptionCodeValidation = {
        isValid: validationResult.data.isValid,
        workerId: validationResult.data.exceptionCode?.workerId,
        error: validationResult.data.error
      };
      
      console.log('[AttendanceProcessingService] Resultado validación código de excepción:', exceptionCodeValidation);
      
      // ❌ Si el código es inválido, lanzar BadRequestException (HTTP 400)
      // El frontend detectará esto automáticamente como error no-reintentable
      if (!exceptionCodeValidation.isValid) {
        console.log('[AttendanceProcessingService] ❌ Código de excepción inválido - lanzando BadRequestException');
        const { BadRequestException } = require('@nestjs/common');
        throw new BadRequestException({
          error: 'INVALID_EXCEPTION_CODE',
          message: exceptionCodeValidation.error || 'Código de excepción inválido o expirado'
        });
      }
    }
    console.log('[AttendanceProcessingService] ✅ Validación de código de excepción completada');

    // 3. Preparar contexto para validación
    console.log('[AttendanceProcessingService] Paso 3: Construyendo contexto de validación...');
    const context = await this.buildValidationContext(workerId, dto, depotId);
    console.log('[AttendanceProcessingService] ✅ Contexto construido:', {
      depotId: context.depot.id,
      hasLastRecord: !!context.lastRecord,
      historyCount: context.workerAttendanceHistory?.length || 0
    });

    // 3. Ejecutar validaciones anti-fraude
    console.log('[AttendanceProcessingService] Paso 3: Ejecutando validaciones anti-fraude...');
    const validationResult = await this.antiFraudValidator.validateRecord(
      this.mapDtoToValidationData(dto, workerId, deviceId, type),
      context,
    );
    
    // 3.1. Agregar información del código de excepción al resultado de validación
    if (dto.exceptionCode && exceptionCodeValidation?.isValid) {
      const exceptionCodeDetails = await this.exceptionCodeService.validateExceptionCode({
        code: dto.exceptionCode
      });
      
      if (exceptionCodeDetails.data.exceptionCode) {
        validationResult.exceptionCode = {
          id: exceptionCodeDetails.data.exceptionCode.id,
          code: exceptionCodeDetails.data.exceptionCode.code
        };
      }
    }
    
    console.log('[AttendanceProcessingService] ✅ Validaciones completadas:', {
      status: validationResult.overallStatus,
      fraudScore: validationResult.fraudScore.score,
      needsManualReview: validationResult.needsManualReview,
      hasExceptionCode: !!validationResult.exceptionCode
    });

    // 4. Procesar y guardar imagen
    console.log('[AttendanceProcessingService] Paso 4: Procesando y guardando imagen...');
    let finalPhotoPath: string;
    try {
      finalPhotoPath = await this.photoStorageService.processAndSavePhoto(dto.photo, workerId);
      console.log('[AttendanceProcessingService] ✅ Imagen guardada en:', finalPhotoPath);
    } catch (error) {
      console.error('[AttendanceProcessingService] ❌ Error procesando imagen:', error);
      throw new Error(`Failed to process photo: ${error.message}`);
    }

    // 5. Obtener información real de la imagen si no viene en metadata
    console.log('[AttendanceProcessingService] Paso 5: Procesando metadata de imagen...');
    if (!dto.photoMetadata) {
      const imageInfo = this.photoStorageService.getImageInfo(dto.photo);
      dto.photoMetadata = {
        timestamp: new Date().toISOString(),
        hasCameraInfo: false, // No podemos detectar esto desde Base64
        fileSize: imageInfo.size,
        dimensions: undefined, // Se podría agregar librería para detectar dimensiones
      };
    }
    console.log('[AttendanceProcessingService] ✅ Metadata procesada');

    // 6. Manejar attendance según el tipo
    console.log('[AttendanceProcessingService] Paso 6: Manejando attendance según tipo...');
    const attendance = await this.handleAttendanceByType(
      workerId,
      dto.timestamp,
      depotId,
      type,
    );
    console.log('[AttendanceProcessingService] ✅ Attendance manejado:', {
      attendanceId: attendance.id,
      date: attendance.date,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime
    });

    // 7. Crear registro de attendance
    console.log('[AttendanceProcessingService] Paso 7: Creando registro de attendance...');
    const record = await this.createAttendanceRecord(
      dto,
      finalPhotoPath,
      workerId,
      deviceId,
      type,
      validationResult,
      attendance.id,
    );
    console.log('[AttendanceProcessingService] ✅ Registro creado:', {
      recordId: record.id,
      status: record.status
    });

    // 7.1. Marcar código de excepción como usado (SOLO después del registro exitoso)
    if (dto.exceptionCode && validationResult?.exceptionCode) {
      console.log('[AttendanceProcessingService] Paso 7.1: Marcando código de excepción como usado...');
      try {
        await this.exceptionCodeService.markExceptionCodeAsUsed(
          validationResult.exceptionCode.id,
          record.id
        );
        console.log('[AttendanceProcessingService] ✅ Código de excepción marcado como usado');
      } catch (error) {
        // Log pero no falla el proceso (el registro ya se creó exitosamente)
        console.error('[AttendanceProcessingService] ⚠️ Error al marcar código como usado:', error);
      }
    }

    // 8. Actualizar attendance con los tiempos correspondientes
    console.log('[AttendanceProcessingService] Paso 8: Actualizando tiempos de attendance...');
    const updatedAttendance = await this.updateAttendanceTime(
      attendance.id,
      dto.timestamp,
      type,
    );
    console.log('[AttendanceProcessingService] ✅ Tiempos actualizados:', {
      entryTime: updatedAttendance.entryTime,
      exitTime: updatedAttendance.exitTime
    });

    // 9. Construir respuesta
    console.log('[AttendanceProcessingService] Paso 9: Construyendo respuesta...');
    const response = this.buildResponse(
      record,
      updatedAttendance,
      validationResult,
      type,
      dto.timestamp,
    );
    
    console.log('[AttendanceProcessingService] 🎉 Procesamiento completado exitosamente:', {
      recordId: response.recordId,
      attendanceId: response.attendanceId,
      success: response.success,
      recordStatus: response.recordStatus,
      fraudScore: response.fraudScore
    });

    return response;
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

    console.log('[AttendanceProcessingService] 🔍 Buscando attendance existente para entrada...');
    
    // Buscar todos los attendances del día
    const endOfDay = new Date(recordDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAttendances = await this.attendanceRepository.findAttendances({
      workerId,
      dateFrom: recordDate,
      dateTo: endOfDay
    });

    console.log('[AttendanceProcessingService] 📊 Attendances encontrados:', existingAttendances?.length || 0);

    // Si no hay attendances del día, crear el primero
    if (!existingAttendances || existingAttendances.length === 0) {
      console.log('[AttendanceProcessingService] ➕ No existe attendance, creando nuevo...');
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        workerId,
        depotId,
      });
    }

    // Buscar un attendance que no tenga entrada o que esté incompleto
    const incompleteAttendance = existingAttendances.find(att => 
      !att.entryTime || (!att.entryTime && !att.exitTime)
    );

    if (incompleteAttendance) {
      console.log('[AttendanceProcessingService] ♻️ Reutilizando attendance incompleto...');
      return incompleteAttendance;
    }

    // Buscar un attendance que solo tenga entrada (sin salida)
    const openAttendance = existingAttendances.find(att => 
      att.entryTime && !att.exitTime
    );

    if (openAttendance) {
      console.log('[AttendanceProcessingService] 🔄 Attendance abierto encontrado - creando nuevo turno...');
      // Crear un nuevo attendance para el nuevo turno
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        workerId,
        depotId,
      });
    }

    // Todos los attendances están completos, crear uno nuevo
    console.log('[AttendanceProcessingService] 🆕 Todos los turnos completos - creando nuevo turno...');
    return await this.attendanceRepository.createAttendance({
      date: recordDate,
      workerId,
      depotId,
    });
  }

  private async handleAttendanceForExit(workerId: string, timestamp: string, depotId: string) {
    const recordDate = new Date(timestamp);
    recordDate.setHours(0, 0, 0, 0);

    console.log('[AttendanceProcessingService] 🔍 Buscando attendance existente para salida...');
    
    // Buscar todos los attendances del día
    const endOfDay = new Date(recordDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAttendances = await this.attendanceRepository.findAttendances({
      workerId,
      dateFrom: recordDate,
      dateTo: endOfDay
    });

    console.log('[AttendanceProcessingService] 📊 Attendances encontrados para salida:', existingAttendances?.length || 0);

    if (!existingAttendances || existingAttendances.length === 0) {
      // Caso 1: No hay attendance -> Crear con solo salida
      console.log('[AttendanceProcessingService] ➕ No existe attendance, creando con solo salida...');
      return await this.attendanceRepository.createAttendance({
        date: recordDate,
        exitTime: new Date(timestamp),
        workerId,
        depotId,
      });
    }

    // Buscar un attendance que tenga entrada pero no salida (turno abierto)
    const openAttendance = existingAttendances.find(att => 
      att.entryTime && !att.exitTime
    );

    if (openAttendance) {
      console.log('[AttendanceProcessingService] ✅ Turno abierto encontrado - cerrando turno...');
      return openAttendance;
    }

    // Buscar un attendance que no tenga ni entrada ni salida
    const emptyAttendance = existingAttendances.find(att => 
      !att.entryTime && !att.exitTime
    );

    if (emptyAttendance) {
      console.log('[AttendanceProcessingService] ♻️ Attendance vacío encontrado - agregando salida...');
      return emptyAttendance;
    }

    // Todos los attendances están completos, crear uno nuevo con solo salida
    console.log('[AttendanceProcessingService] 🆕 Todos los turnos completos - creando nuevo con solo salida...');
    return await this.attendanceRepository.createAttendance({
      date: recordDate,
      exitTime: new Date(timestamp),
      workerId,
      depotId,
    });
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
        latitude: depot.latitude.toNumber(),
        longitude: depot.longitude.toNumber(),
        radius: depot.radius,
        secret: depot.secret,
      },
      lastRecord: lastRecord || undefined,
      workerAttendanceHistory,
      deviceInfo,
    };
  }

  private mapDtoToValidationData(dto: RecordAttendanceDto, workerId: string, deviceId: string, type: AttendanceType) {
    return {
      type,
      timestamp: new Date(dto.timestamp),
      qrCodeUsed: dto.qrCodeUsed,
      exceptionCodeUsed: dto.exceptionCode,
      photoPath: dto.photo, // Usar dto.photo para validaciones (pero se procesará después)
      photoMetadata: dto.photoMetadata,
      location: dto.location,
      deviceId: deviceId, // Usar deviceId real de la autenticación
      workerId,
      createdOffline: dto.createdOffline,
    };
  }

  private async createAttendanceRecord(
    dto: RecordAttendanceDto,
    photoPath: string,
    workerId: string,
    deviceId: string,
    type: AttendanceType,
    validationResult: any,
    attendanceId: string,
  ) {
    // Extraer y formatear errores de validación en español
    const validationErrors = this.extractValidationErrorsForStorage(validationResult);
    
    return await this.attendanceRepository.createAttendanceRecord({
      type,
      timestamp: new Date(dto.timestamp),
      status: validationResult.overallStatus,
      qrCodeUsed: dto.qrCodeUsed,
      exceptionCode: dto.exceptionCode,
      photoPath: photoPath,
      photoMetadata: dto.photoMetadata ? JSON.stringify(dto.photoMetadata) : null,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      accuracy: dto.location.accuracy,
      validationErrors: JSON.stringify(validationErrors),
      fraudScore: validationResult.fraudScore?.score || 0,
      processedAt: new Date(),
      createdOffline: dto.createdOffline || false,
      workerId,
      deviceId: deviceId, // Usar deviceId real
      attendanceId,
    });
  }

  /**
   * Extraer errores de validación en formato comprensible para guardar en BD
   */
  private extractValidationErrorsForStorage(validationResult: any): Array<{
    categoria: string;
    nivel: 'critico' | 'sospechoso' | 'advertencia';
    mensaje: string;
    severidad: number;
    detalles?: any;
  }> {
    const errors: Array<{
      categoria: string;
      nivel: 'critico' | 'sospechoso' | 'advertencia';
      mensaje: string;
      severidad: number;
      detalles?: any;
    }> = [];

    if (!validationResult?.validationResults) {
      return errors;
    }

    // Procesar cada categoría de validación
    const categories = {
      temporal: 'Temporal',
      cryptographic: 'Criptográfica',
      geolocation: 'Geolocalización',
      photo: 'Fotográfica',
      pattern: 'Patrones'
    };

    for (const [key, categoryName] of Object.entries(categories)) {
      const results = validationResult.validationResults[key] || [];
      
      results.forEach((result: any) => {
        // Solo incluir validaciones que fallaron o son sospechosas
        if (!result.isValid || result.isSuspicious) {
          const nivel = !result.isValid ? 'critico' : 
                       result.isSuspicious ? 'sospechoso' : 'advertencia';
          
          errors.push({
            categoria: categoryName,
            nivel,
            mensaje: result.message || 'Error de validación',
            severidad: result.severity || 0,
            detalles: result.details || null
          });
        }
      });
    }

    return errors;
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
    
    // ✅ NUEVA LÓGICA: Siempre success=true porque el registro se guardó y el turno se actualizó
    // recordStatus (ACCEPTED/SUSPICIOUS/REJECTED) es solo informativo para el admin
    // El trabajador SIEMPRE ve "Entrada/Salida registrada exitosamente"
    return {
      recordId: record.id,
      attendanceId: attendance.id,
      success: true, // ✅ Siempre true - el registro se guardó y el turno se actualizó
      recordStatus: validationResult.overallStatus, // ℹ️ Solo para dashboard de admin
      fraudScore: validationResult.fraudScore.score,
      message: this.getWorkerFriendlyMessage(type), // ✅ Mensaje simple para el trabajador
      shift: {
        date: attendance.date.toISOString().split('T')[0],
        entryTime: attendance.entryTime?.toISOString() || null,
        exitTime: attendance.exitTime?.toISOString() || null,
        isComplete,
        totalHours: attendance.totalHours || undefined,
      },
    };
  }

  /**
   * Mensaje simple y amigable para el trabajador
   * Siempre positivo - el trabajador no necesita saber sobre validaciones antifraude
   */
  private getWorkerFriendlyMessage(type: AttendanceType): string {
    return type === AttendanceType.ENTRY 
      ? 'Entrada registrada exitosamente' 
      : 'Salida registrada exitosamente';
  }

  /**
   * Método legacy - mantener para compatibilidad si se usa en otros lugares
   */
  private getStatusMessage(status: RecordStatus, summary: string, type: AttendanceType): string {
    const actionText = type === AttendanceType.ENTRY ? 'Entrada' : 'Salida';
    
    // ✅ SIMPLE: Siempre mostrar mensaje positivo al trabajador
    // El status real (ACCEPTED/SUSPICIOUS/REJECTED) lo revisa el admin en el dashboard
    switch (status) {
      case RecordStatus.ACCEPTED:
      case RecordStatus.SUSPICIOUS:
      case RecordStatus.REJECTED:
        return `${actionText} registrada exitosamente`;
      case RecordStatus.PENDING:
        return `${actionText} pendiente de procesamiento`;
      default:
        return summary;
    }
  }
}
