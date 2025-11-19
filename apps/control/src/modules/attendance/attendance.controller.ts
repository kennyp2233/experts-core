import { Controller, Post, Get, Body, Request, HttpStatus, HttpCode, UseGuards, Param, Query, ValidationPipe } from '@nestjs/common';
import { RecordEntryUseCase } from './application/use-cases/record-entry.use-case';
import { RecordExitUseCase } from './application/use-cases/record-exit.use-case';
import { ValidateAttendanceUseCase } from './application/use-cases/validate-attendance.use-case';
import { GetWorkerShiftHistoryUseCase } from './application/use-cases/get-worker-shift-history.use-case';
import { GetShiftAuditUseCase } from './application/use-cases/get-shift-audit.use-case';
import { GetWorkerDetailedStatsUseCase } from './application/use-cases/get-worker-detailed-stats.use-case';
import { RecordAttendanceDto } from './application/dto/record-attendance.dto';
import { AttendanceResponseDto } from './application/dto/attendance-response.dto';
import { ValidationResultDto } from './application/dto/validation-result.dto';
import { GetWorkerHistoryQueryDto } from './application/dto/get-worker-history-query.dto';
import { WorkerShiftHistoryResponseDto } from './application/dto/worker-shift-history-response.dto';
import { GetShiftAuditDto } from './application/dto/get-shift-audit.dto';
import { ShiftAuditResponseDto } from './application/dto/shift-audit-response.dto';
import { GetWorkerStatsQueryDto } from './application/dto/get-worker-stats-query.dto';
import { WorkerDetailedStatsResponseDto } from './application/dto/worker-detailed-stats-response.dto';
import { DashboardResponseDto } from './application/dto/dashboard-response.dto';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { AttendanceType } from './domain/enums/attendance-type.enum';
import { WorkerAuthGuard } from '../worker-auth/guards/worker-auth.guard';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

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
    private readonly getWorkerShiftHistoryUseCase: GetWorkerShiftHistoryUseCase,
    private readonly getShiftAuditUseCase: GetShiftAuditUseCase,
    private readonly getWorkerDetailedStatsUseCase: GetWorkerDetailedStatsUseCase,
    private readonly getDashboardUseCase: GetDashboardUseCase,
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
        success: result.success,
        recordStatus: result.recordStatus,
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
        success: result.success,
        recordStatus: result.recordStatus,
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

  @Get('dashboard')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getDashboard(
    @Query('depotId') depotId?: string,
    @Request() req?,
  ): Promise<DashboardResponseDto> {
    console.log('[AttendanceController] 📊 GET /attendance/dashboard - Obteniendo dashboard de asistencias');
    console.log('[AttendanceController] DepotId:', depotId);

    try {
      const result = await this.getDashboardUseCase.execute(depotId);
      console.log('[AttendanceController] ✅ Dashboard obtenido exitosamente:', {
        totalWorkers: result.totalWorkers,
        workersOnShift: result.workersOnShift,
        workersOffShift: result.workersOffShift,
        totalNetHoursToday: result.totalNetHoursToday,
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error obteniendo dashboard:', error);
      throw error;
    }
  }

  @Get('worker/:workerId/history')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getWorkerHistory(
    @Param('workerId') workerId: string,
    @Query(new ValidationPipe({ transform: true })) query: GetWorkerHistoryQueryDto,
    @Request() req
  ): Promise<WorkerShiftHistoryResponseDto> {
    console.log('[AttendanceController] 📊 GET /attendance/worker/:workerId/history - Obteniendo historial de turnos');
    console.log('[AttendanceController] Worker:', { id: workerId });
    console.log('[AttendanceController] Query:', query);

    try {
      const result = await this.getWorkerShiftHistoryUseCase.execute(workerId, query);
      console.log('[AttendanceController] ✅ Historial obtenido exitosamente:', {
        shiftsCount: result.shifts.length,
        dateRange: result.dateRange
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error obteniendo historial:', error);
      throw error;
    }
  }

  @Get('shift/:shiftId/audit')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getShiftAudit(
    @Param('shiftId') shiftId: string,
    @Request() req
  ): Promise<ShiftAuditResponseDto> {
    console.log('[AttendanceController] 🔍 GET /attendance/shift/:shiftId/audit - Obteniendo auditoría de turno');
    console.log('[AttendanceController] Shift:', { id: shiftId });

    try {
      const result = await this.getShiftAuditUseCase.execute({ shiftId });
      console.log('[AttendanceController] ✅ Auditoría obtenida exitosamente:', {
        recordsCount: result.records.length,
        riskScore: result.auditSummary.overallRiskScore
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error obteniendo auditoría:', error);
      throw error;
    }
  }

  @Get('worker/:workerId/stats')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getWorkerStats(
    @Param('workerId') workerId: string,
    @Query(new ValidationPipe({ transform: true })) query: GetWorkerStatsQueryDto,
    @Request() req
  ): Promise<WorkerDetailedStatsResponseDto> {
    console.log('[AttendanceController] 📈 GET /attendance/worker/:workerId/stats - Obteniendo estadísticas detalladas');
    console.log('[AttendanceController] Worker:', { id: workerId });
    console.log('[AttendanceController] Query:', query);

    try {
      const result = await this.getWorkerDetailedStatsUseCase.execute(workerId, query);
      console.log('[AttendanceController] ✅ Estadísticas obtenidas exitosamente:', {
        attendanceRate: result.attendance.attendanceRate,
        totalHours: result.hours.totalHours
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  @Get('worker/:workerId/recent')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getWorkerRecentShifts(
    @Param('workerId') workerId: string,
    @Request() req
  ): Promise<WorkerShiftHistoryResponseDto> {
    console.log('[AttendanceController] 🕐 GET /attendance/worker/:workerId/recent - Obteniendo turnos recientes');
    console.log('[AttendanceController] Worker:', { id: workerId });

    try {
      // Obtener últimos 5 turnos + turno activo si existe
      const result = await this.getWorkerShiftHistoryUseCase.execute(workerId, {
        limit: 5,
        offset: 0
      });
      console.log('[AttendanceController] ✅ Turnos recientes obtenidos exitosamente:', {
        shiftsCount: result.shifts.length
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error obteniendo turnos recientes:', error);
      throw error;
    }
  }

  /**
   * Endpoint para que los workers obtengan su propio estado de turno
   * Autenticado con WorkerAuthGuard (token de worker)
   */
  @Get('my-shift-status')
  @UseGuards(WorkerAuthGuard)
  async getMyShiftStatus(@Request() req): Promise<WorkerShiftHistoryResponseDto> {
    const workerId = req.user.workerId; // El WorkerAuthGuard pone el workerId en req.user
    console.log('[AttendanceController] 🕐 GET /attendance/my-shift-status - Worker obteniendo su estado');
    console.log('[AttendanceController] Worker ID:', workerId);

    try {
      // Obtener últimos 5 turnos + turno activo si existe
      const result = await this.getWorkerShiftHistoryUseCase.execute(workerId, {
        limit: 5,
        offset: 0
      });
      console.log('[AttendanceController] ✅ Estado de turno obtenido exitosamente:', {
        shiftsCount: result.shifts.length
      });
      return result;
    } catch (error) {
      console.error('[AttendanceController] ❌ Error obteniendo estado de turno:', error);
      throw error;
    }
  }
}
