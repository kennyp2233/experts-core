import { Controller, Post, Get, Body, Param, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { RecordEntryUseCase } from './application/use-cases/record-entry.use-case';
import { RecordExitUseCase } from './application/use-cases/record-exit.use-case';
import { ValidateAttendanceUseCase } from './application/use-cases/validate-attendance.use-case';
import { SyncOfflineBatchUseCase } from './application/use-cases/sync-offline-batch.use-case';
import { RecordAttendanceDto } from './application/dto/record-attendance.dto';
import { SyncBatchDto, BatchSyncResponseDto } from './application/dto/sync-batch.dto';
import { AttendanceResponseDto } from './application/dto/attendance-response.dto';
import { ValidationResultDto } from './application/dto/validation-result.dto';
import { AttendanceType } from './domain/enums/attendance-type.enum';

// Interface para ValidateAttendanceDto
interface ValidateAttendanceDto {
  workerId: string;
  type: AttendanceType;
  timestamp: string;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  photoMetadata?: {
    fileName: string;
    size: number;
    mimeType: string;
    quality: number;
    width: number;
    height: number;
    faceDetected: boolean;
    hasLocationMetadata: boolean;
    createdAt: string;
  };
  deviceInfo: {
    deviceId: string;
    deviceModel: string;
    osVersion: string;
    appVersion: string;
    batteryLevel: number;
    isCharging: boolean;
    hasVpn: boolean;
    hasProxy: boolean;
    isEmulator: boolean;
    isRooted: boolean;
    networkType: string;
  };
  encryptedPayload: string;
}

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly recordEntryUseCase: RecordEntryUseCase,
    private readonly recordExitUseCase: RecordExitUseCase,
    private readonly validateAttendanceUseCase: ValidateAttendanceUseCase,
    private readonly syncOfflineBatchUseCase: SyncOfflineBatchUseCase,
  ) {}

  /**
   * Registrar entrada de trabajador
   * Usado por apps móviles para registrar cuando un worker llega al depot
   */
  @Post('record/entry')
  @HttpCode(HttpStatus.CREATED)
  async recordEntry(
    @Body() dto: RecordAttendanceDto,
    @Query('workerId') workerId: string,
  ): Promise<AttendanceResponseDto> {
    return await this.recordEntryUseCase.execute(dto, workerId);
  }

  /**
   * Registrar salida de trabajador
   * Usado por apps móviles para registrar cuando un worker sale del depot
   */
  @Post('record/exit')
  @HttpCode(HttpStatus.CREATED)
  async recordExit(
    @Body() dto: RecordAttendanceDto,
    @Query('workerId') workerId: string,
  ): Promise<AttendanceResponseDto> {
    return await this.recordExitUseCase.execute(dto, workerId);
  }

  /**
   * Validar registro de asistencia sin persistir
   * Usado para pre-validación o testing
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateAttendance(
    @Body() dto: ValidateAttendanceDto,
  ): Promise<ValidationResultDto> {
    return await this.validateAttendanceUseCase.execute(dto);
  }

  /**
   * Sincronizar lote de registros offline
   * Usado cuando el worker recupera conectividad y sube registros acumulados
   */
  @Post('sync-batch')
  @HttpCode(HttpStatus.OK)
  async syncOfflineBatch(
    @Body() dto: SyncBatchDto,
    @Query('workerId') workerId: string,
  ): Promise<BatchSyncResponseDto> {
    return await this.syncOfflineBatchUseCase.execute(dto, workerId);
  }

  /**
   * Sincronizar lote con validación completa
   * Incluye validaciones de orden cronológico y secuencia lógica
   */
  @Post('sync-batch/validated')
  @HttpCode(HttpStatus.OK)
  async syncValidatedBatch(
    @Body() dto: SyncBatchDto,
    @Query('workerId') workerId: string,
  ): Promise<BatchSyncResponseDto> {
    return await this.syncOfflineBatchUseCase.executeWithValidation(dto, workerId);
  }

  /**
   * Health check del módulo de asistencia
   * Usado para monitoreo de infraestructura
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      module: 'attendance',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        '/record/entry': 'operational',
        '/record/exit': 'operational', 
        '/validate': 'operational',
        '/sync-batch': 'operational',
      },
    };
  }
}
