import { Controller, Post, Get, Body, Request, HttpStatus, HttpCode, UseGuards } from '@nestjs/common';
import { RecordEntryUseCase } from './application/use-cases/record-entry.use-case';
import { RecordExitUseCase } from './application/use-cases/record-exit.use-case';
import { ValidateAttendanceUseCase } from './application/use-cases/validate-attendance.use-case';
import { RecordAttendanceDto } from './application/dto/record-attendance.dto';
import { AttendanceResponseDto } from './application/dto/attendance-response.dto';
import { ValidationResultDto } from './application/dto/validation-result.dto';
import { AttendanceType } from './domain/enums/attendance-type.enum';
import { WorkerAuthGuard } from '../worker-auth/guards/worker-auth.guard';

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
  ) {}

  @Post('entry')
  @UseGuards(WorkerAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async recordEntry(
    @Body() dto: RecordAttendanceDto,
    @Request() req
  ): Promise<AttendanceResponseDto> {
    console.log('[AttendanceController] 📥 POST /attendance/entry - Iniciando registro de entrada');
    console.log('[AttendanceController] Worker:', {
      id: req.worker?.id,
      name: req.worker?.name,
      depotId: req.worker?.depot?.id
    });
    console.log('[AttendanceController] DTO recibido:', {
      type: dto.type,
      qrCodeUsed: dto.qrCodeUsed?.substring(0, 50) + '...',
      photoSize: dto.photo?.length || 0,
      location: dto.location,
      deviceId: dto.deviceId,
      timestamp: dto.timestamp,
      createdOffline: dto.createdOffline
    });

    try {
      const result = await this.recordEntryUseCase.execute(dto, req.worker.id, req.worker.depot.id, req.device.id);
      console.log('[AttendanceController] ✅ Registro de entrada exitoso:', {
        recordId: result.recordId,
        attendanceId: result.attendanceId,
        status: result.status,
        fraudScore: result.fraudScore
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error en registro de entrada:', error);
      throw error;
    }
  }

  @Post('exit')
  @UseGuards(WorkerAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async recordExit(
    @Body() dto: RecordAttendanceDto,
    @Request() req
  ): Promise<AttendanceResponseDto> {
    console.log('[AttendanceController] 📤 POST /attendance/exit - Iniciando registro de salida');
    console.log('[AttendanceController] Worker:', {
      id: req.worker?.id,
      name: req.worker?.name,
      depotId: req.worker?.depot?.id
    });
    console.log('[AttendanceController] DTO recibido:', {
      type: dto.type,
      qrCodeUsed: dto.qrCodeUsed?.substring(0, 50) + '...',
      photoSize: dto.photo?.length || 0,
      location: dto.location,
      deviceId: dto.deviceId,
      timestamp: dto.timestamp,
      createdOffline: dto.createdOffline
    });

    try {
      const result = await this.recordExitUseCase.execute(dto, req.worker.id, req.worker.depot.id, req.device.id);
      console.log('[AttendanceController] ✅ Registro de salida exitoso:', {
        recordId: result.recordId,
        attendanceId: result.attendanceId,
        status: result.status,
        fraudScore: result.fraudScore
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error en registro de salida:', error);
      throw error;
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateAttendance(
    @Body() dto: ValidateAttendanceDto,
  ): Promise<ValidationResultDto> {
    return await this.validateAttendanceUseCase.execute(dto);
  }

  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      module: 'attendance',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}
