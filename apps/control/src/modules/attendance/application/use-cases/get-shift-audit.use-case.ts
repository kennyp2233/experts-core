import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { WorkersService } from '../../../workers/workers.service';
import { AntiFraudValidatorDomainService } from '../../domain/services/anti-fraud-validator.domain-service';
import { GetShiftAuditDto } from '../dto/get-shift-audit.dto';
import { ShiftAuditResponseDto, AuditRecordDto } from '../dto/shift-audit-response.dto';

@Injectable()
export class GetShiftAuditUseCase {
  private readonly logger = new Logger(GetShiftAuditUseCase.name);

  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly workersService: WorkersService,
    private readonly antiFraudValidator: AntiFraudValidatorDomainService,
  ) {}

  async execute(dto: GetShiftAuditDto): Promise<ShiftAuditResponseDto> {
    this.logger.log(`🚀 Ejecutando caso de uso - Obtener auditoría de turno`);
    this.logger.debug(`Parámetros:`, { shiftId: dto.shiftId });

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

      this.logger.debug(`Encontrados ${records.length} registros para el turno`);

      // Procesar cada registro para obtener datos de auditoría detallados
      const auditRecords: AuditRecordDto[] = await Promise.all(
        records.map(async (record) => {
          // Obtener datos de validación anti-fraude del registro
          const storedFraudScore = record.fraudScore;
          const validationErrors = record.validationErrors ? JSON.parse(record.validationErrors) : [];

          // Extraer TODAS las validaciones necesarias
          const timeValidation = this.extractValidationByType(validationErrors, 'temporal');
          const cryptographicValidation = this.extractValidationByType(validationErrors, 'cryptographic');
          const locationValidation = this.extractValidationByType(validationErrors, 'geolocation');

          // Combinar validaciones del QR en una sola categoría
          const qrValidation = this.combineQRValidations(timeValidation, cryptographicValidation);

          // Calcular fraud score real basado en las validaciones individuales
          const calculatedFraudScore = this.calculateOverallFraudScore(
            qrValidation.score,
            locationValidation.score,
            timeValidation.score
          );

          // Usar el fraud score almacenado si existe, sino el calculado
          const finalFraudScore = storedFraudScore?.score ?? calculatedFraudScore;

          this.logger.debug(`Record ${record.id}: stored=${storedFraudScore?.score}, calculated=${calculatedFraudScore}, final=${finalFraudScore}`);

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
              googleMapsUrl: `https://www.google.com/maps?q=${record.gpsCoordinate.latitude},${record.gpsCoordinate.longitude}`,
            } : {
              latitude: 0,
              longitude: 0,
              accuracy: 0,
              googleMapsUrl: '',
            },
            photo: {
              hasPhoto: !!record.photoPath,
              photoPath: record.photoPath,
              metadata: record.photoMetadata?.toJSON(),
            },
            fraudValidation: {
              // Convertir fraud score del backend (más alto = peor) a score del frontend (más alto = mejor)
              overallScore: this.convertFraudScoreToQualityScore(finalFraudScore),
              qrValidation: {
                ...qrValidation,
                score: this.convertFraudScoreToQualityScore(qrValidation.score),
              },
              locationValidation: {
                ...locationValidation,
                score: this.convertFraudScoreToQualityScore(locationValidation.score),
              },
            },
            technical: {
              deviceId: record.deviceId,
              createdOffline: record.createdOffline,
              syncStatus: record.syncedAt ? 'SYNCED' : 'PENDING',
              qrTokenUsed: record.qrCodeUsed || '',
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

      // Calcular resumen de auditoría usando scores convertidos
      const overallRiskScore = auditRecords.length > 0
        ? Math.round(auditRecords.reduce((sum, r) => sum + r.fraudValidation.overallScore, 0) / auditRecords.length)
        : 100; // Score perfecto si no hay registros

      // Ajustar lógica para scores convertidos (ahora más alto = mejor)
      const hasRedFlags = auditRecords.some(r =>
        r.fraudValidation.overallScore < 50 || // Score bajo indica problemas
        r.status === 'REJECTED'
      );

      const needsManualReview = auditRecords.some(r =>
        r.status === 'SUSPICIOUS' ||
        r.fraudValidation.overallScore < 70 // Score bajo necesita revisión
      );

      const issuesFound = this.collectAllIssues(auditRecords);
      const validationsPerformed = auditRecords.reduce((sum, r) =>
        sum + (r.fraudValidation.qrValidation.valid ? 1 : 0) +
        (r.fraudValidation.locationValidation.valid ? 1 : 0), 0
        // ✅ Solo contar QR y location
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

      this.logger.log('✅ Caso de uso completado exitosamente');
      return response;
    } catch (error) {
      this.logger.error(`❌ Error en caso de uso:`, error);
      throw error;
    }
  }

  /**
   * Calcula el fraud score general basado en scores individuales
   */
  private calculateOverallFraudScore(qrScore: number, locationScore: number, timeScore: number): number {
    // Promedio ponderado de los scores
    const weights = { qr: 0.4, location: 0.4, time: 0.2 };

    const weightedScore = (qrScore * weights.qr) +
                         (locationScore * weights.location) +
                         (timeScore * weights.time);

    return Math.min(Math.round(weightedScore), 100);
  }

  /**
   * Convierte fraud score del backend (más alto = peor) a quality score del frontend (más alto = mejor)
   * Función más graduada y realista
   */
  private convertFraudScoreToQualityScore(fraudScore: number): number {
    // Fraud score: 0 = perfecto, 100 = máximo fraude
    // Quality score: 100 = perfecto, 0 = máximo problema

    if (fraudScore === 0) return 100;   // Perfecto: sin problemas
    if (fraudScore <= 5) return 95;     // Excelente: problemas mínimos
    if (fraudScore <= 15) return 85;    // Muy bueno: problemas menores
    if (fraudScore <= 30) return 75;    // Bueno: algunos problemas
    if (fraudScore <= 50) return 60;    // Aceptable: varios problemas
    if (fraudScore <= 70) return 45;    // Problemático: muchos problemas
    if (fraudScore <= 85) return 25;    // Grave: problemas serios
    return 10; // Crítico: problemas críticos
  }

  private extractValidationByType(validationErrors: any[], type: string): { valid: boolean; score: number; issues: string[] } {
    // Mapeo de nombres de tipos para compatibilidad
    const typeMap: Record<string, string[]> = {
      'temporal': ['Temporal', 'temporal'],
      'cryptographic': ['Criptográfica', 'cryptographic'],
      'geolocation': ['Geolocalización', 'geolocation'],
      'photo': ['Fotográfica', 'photo'],
      'pattern': ['Patrones', 'pattern']
    };

    // Filtrar errores por categoría (nuevo formato en español) o level (formato antiguo)
    const typeErrors = validationErrors.filter(error => {
      const matchCategories = typeMap[type] || [type];
      return matchCategories.includes(error.categoria) || matchCategories.includes(error.level);
    });

    const valid = typeErrors.length === 0;

    // Calcular fraud score basado en cantidad y severidad de errores
    let fraudScore = 0;
    if (!valid) {
      // Score base por cantidad de errores (más conservador)
      fraudScore = Math.min(typeErrors.length * 15, 60); // Base más baja

      // Agregar severidad acumulada de todos los errores
      const totalSeverity = typeErrors.reduce((sum, error) => {
        return sum + (error.severidad || error.severity || 10); // Soportar ambos formatos
      }, 0);

      fraudScore = Math.min(fraudScore + totalSeverity, 100);
    }

    // Extraer mensajes en español (nuevo formato) o inglés (formato antiguo)
    const issues = typeErrors.map(error => 
      error.mensaje || error.message || error.error || 'Problema desconocido'
    );

    this.logger.debug(`Validation for ${type}: ${typeErrors.length} errors, fraud score: ${fraudScore}`);

    return { valid, score: fraudScore, issues }; // Retorna fraud score, se convertirá después
  }

  private collectAllIssues(records: AuditRecordDto[]): string[] {
    const issues: string[] = [];

    records.forEach(record => {
      if (!record.fraudValidation.qrValidation.valid) {
        issues.push(...record.fraudValidation.qrValidation.issues.map(issue => `QR: ${issue}`));
      }
      if (!record.fraudValidation.locationValidation.valid) {
        issues.push(...record.fraudValidation.locationValidation.issues.map(issue => `Location: ${issue}`));
      }
      if (record.status === 'REJECTED') {
        issues.push(`Record ${record.id} was rejected`);
      }
    });

    return [...new Set(issues)]; // Remover duplicados
  }

  /**
   * Combinar validaciones temporales y criptográficas del QR en una sola validación
   */
  private combineQRValidations(
    timeValidation: { valid: boolean; score: number; issues: string[] },
    cryptographicValidation: { valid: boolean; score: number; issues: string[] }
  ): { valid: boolean; score: number; issues: string[] } {
    return {
      valid: timeValidation.valid && cryptographicValidation.valid,
      score: Math.max(timeValidation.score, cryptographicValidation.score),
      issues: [...timeValidation.issues, ...cryptographicValidation.issues],
    };
  }
}