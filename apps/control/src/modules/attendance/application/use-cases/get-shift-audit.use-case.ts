import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { WorkersService } from '../../../workers/workers.service';
import { AntiFraudValidatorDomainService } from '../../domain/services/anti-fraud-validator.domain-service';
import { GetShiftAuditDto } from '../dto/get-shift-audit.dto';
import { ShiftAuditResponseDto, AuditRecordDto } from '../dto/shift-audit-response.dto';

@Injectable()
export class GetShiftAuditUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly workersService: WorkersService,
    private readonly antiFraudValidator: AntiFraudValidatorDomainService,
  ) {}

  async execute(dto: GetShiftAuditDto): Promise<ShiftAuditResponseDto> {
    console.log('[GetShiftAuditUseCase] 🚀 Ejecutando caso de uso - Obtener auditoría de turno');
    console.log('[GetShiftAuditUseCase] Parámetros:', { shiftId: dto.shiftId });

    try {
      // Validar que el turno existe
      const attendance = await this.attendanceRepository.findAttendanceById(dto.shiftId);
      if (!attendance) {
        throw new NotFoundException(`Turno con ID ${dto.shiftId} no encontrado`);
      }

      // Obtener información del worker
      const worker = await this.workersService.findOne(attendance.workerId);

      // Obtener todos los registros del turno
      const records = await this.attendanceRepository.findRecordsByAttendance(dto.shiftId);

      console.log(`[GetShiftAuditUseCase] Encontrados ${records.length} registros para el turno`);

      // Procesar cada registro para obtener datos de auditoría detallados
      const auditRecords: AuditRecordDto[] = await Promise.all(
        records.map(async (record) => {
          // Obtener datos de validación anti-fraude del registro
          const fraudScore = record.fraudScore;
          const validationErrors = record.validationErrors ? JSON.parse(record.validationErrors) : [];

          // Calcular scores de validación individuales (simplificado)
          const timeValidation = this.extractValidationByType(validationErrors, 'temporal');
          const locationValidation = this.extractValidationByType(validationErrors, 'geolocation');
          const deviceValidation = this.extractValidationByType(validationErrors, 'device');
          const photoValidation = this.extractValidationByType(validationErrors, 'photo');

          return {
            id: record.id,
            type: record.type,
            timestamp: record.timestamp,
            status: record.status,
            location: record.gpsCoordinate ? {
              latitude: record.gpsCoordinate.latitude,
              longitude: record.gpsCoordinate.longitude,
              accuracy: record.gpsCoordinate.accuracy,
              address: undefined, // TODO: Implementar geocoding si es necesario
            } : {
              latitude: 0,
              longitude: 0,
              accuracy: 0,
            },
            photo: {
              hasPhoto: !!record.photoPath,
              photoPath: record.photoPath,
              metadata: record.photoMetadata?.toJSON(),
            },
            fraudValidation: {
              overallScore: fraudScore?.score || 0,
              timeValidation,
              locationValidation,
              deviceValidation,
              photoValidation,
            },
            technical: {
              deviceId: record.deviceId,
              createdOffline: record.createdOffline,
              syncStatus: record.syncedAt ? 'SYNCED' : 'PENDING',
              qrTokenUsed: record.qrCodeUsed,
              processedAt: record.processedAt || record.createdAt,
            },
          };
        }),
      );

      // Determinar status del turno
      let status: 'COMPLETE' | 'INCOMPLETE' | 'ACTIVE';
      if (attendance.isComplete) {
        status = 'COMPLETE';
      } else if (attendance.entryTime && !attendance.exitTime) {
        status = 'ACTIVE';
      } else {
        status = 'INCOMPLETE';
      }

      // Calcular resumen de auditoría
      const overallRiskScore = auditRecords.length > 0
        ? auditRecords.reduce((sum, r) => sum + r.fraudValidation.overallScore, 0) / auditRecords.length
        : 0;

      const hasRedFlags = auditRecords.some(r =>
        r.fraudValidation.overallScore > 70 ||
        r.status === 'REJECTED'
      );

      const needsManualReview = auditRecords.some(r =>
        r.status === 'SUSPICIOUS' ||
        r.fraudValidation.overallScore > 50
      );

      const issuesFound = this.collectAllIssues(auditRecords);
      const validationsPerformed = auditRecords.reduce((sum, r) =>
        sum + (r.fraudValidation.timeValidation.valid ? 1 : 0) +
        (r.fraudValidation.locationValidation.valid ? 1 : 0) +
        (r.fraudValidation.deviceValidation.valid ? 1 : 0) +
        (r.fraudValidation.photoValidation.valid ? 1 : 0), 0
      );

      const response: ShiftAuditResponseDto = {
        shiftId: dto.shiftId,
        workerId: attendance.workerId,
        workerName: `${worker.firstName} ${worker.lastName}`,
        status,
        createdAt: attendance.createdAt,
        totalHours: attendance.totalHours,
        records: auditRecords,
        auditSummary: {
          overallRiskScore,
          hasRedFlags,
          needsManualReview,
          issuesFound,
          validationsPerformed,
        },
      };

      console.log('[GetShiftAuditUseCase] ✅ Caso de uso completado exitosamente');
      return response;
    } catch (error) {
      console.error('[GetShiftAuditUseCase] ❌ Error en caso de uso:', error);
      throw error;
    }
  }

  private extractValidationByType(validationErrors: any[], type: string): { valid: boolean; score: number; issues: string[] } {
    const typeErrors = validationErrors.filter(error => error.level === type);
    const valid = typeErrors.length === 0;
    const score = valid ? 0 : Math.min(typeErrors.length * 20, 100); // Score basado en cantidad de errores
    const issues = typeErrors.map(error => error.error || error.message || 'Unknown issue');

    return { valid, score, issues };
  }

  private collectAllIssues(records: AuditRecordDto[]): string[] {
    const issues: string[] = [];

    records.forEach(record => {
      if (!record.fraudValidation.timeValidation.valid) {
        issues.push(...record.fraudValidation.timeValidation.issues.map(issue => `Time: ${issue}`));
      }
      if (!record.fraudValidation.locationValidation.valid) {
        issues.push(...record.fraudValidation.locationValidation.issues.map(issue => `Location: ${issue}`));
      }
      if (!record.fraudValidation.deviceValidation.valid) {
        issues.push(...record.fraudValidation.deviceValidation.issues.map(issue => `Device: ${issue}`));
      }
      if (!record.fraudValidation.photoValidation.valid) {
        issues.push(...record.fraudValidation.photoValidation.issues.map(issue => `Photo: ${issue}`));
      }
      if (record.status === 'REJECTED') {
        issues.push(`Record ${record.id} was rejected`);
      }
    });

    return [...new Set(issues)]; // Remover duplicados
  }
}