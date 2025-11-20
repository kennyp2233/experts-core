import { Controller, Post, Get, Body, Request, HttpStatus, HttpCode, UseGuards, Param, Query, ValidationPipe, Logger } from '@nestjs/common';
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
import { GetWorkerSummaryQueryDto } from './application/dto/get-worker-summary-query.dto';
import { WorkerSummaryResponseDto } from './application/dto/worker-summary-response.dto';
import { GetWorkerSummaryUseCase } from './application/use-cases/get-worker-summary.use-case';
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
  private readonly logger = new Logger(AttendanceController.name);

  constructor(
    private readonly recordEntryUseCase: RecordEntryUseCase,
    private readonly recordExitUseCase: RecordExitUseCase,
    private readonly validateAttendanceUseCase: ValidateAttendanceUseCase,
    private readonly getWorkerShiftHistoryUseCase: GetWorkerShiftHistoryUseCase,
    private readonly getShiftAuditUseCase: GetShiftAuditUseCase,
    private readonly getWorkerDetailedStatsUseCase: GetWorkerDetailedStatsUseCase,
    private readonly getDashboardUseCase: GetDashboardUseCase,
    private readonly getWorkerSummaryUseCase: GetWorkerSummaryUseCase,
  ) {}

  @Post('entry')
  @UseGuards(WorkerAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async recordEntry(
    @Body() dto: RecordAttendanceDto,
    @Request() req
  ): Promise<AttendanceResponseDto> {
    this.logger.debug(`Worker:`, {
      id: req.worker?.id,
      name: req.worker?.name,
      depotId: req.worker?.depot?.id
    });
    this.logger.debug(`DTO recibido:`, {
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
      this.logger.log(`✅ Registro de entrada exitoso:`, {
        recordId: result.recordId,
        attendanceId: result.attendanceId,
        success: result.success,
        recordStatus: result.recordStatus,
        fraudScore: result.fraudScore
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error en registro de entrada:`, error);
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
    this.logger.debug(`Worker:`, {
      id: req.worker?.id,
      name: req.worker?.name,
      depotId: req.worker?.depot?.id
    });
    this.logger.debug(`DTO recibido:`, {
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
      this.logger.log(`✅ Registro de salida exitoso:`, {
        recordId: result.recordId,
        attendanceId: result.attendanceId,
        success: result.success,
        recordStatus: result.recordStatus,
        fraudScore: result.fraudScore
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error en registro de salida:`, error);
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
    this.logger.debug(`DepotId:`, depotId);

    try {
      const result = await this.getDashboardUseCase.execute(depotId);
      this.logger.log(`✅ Dashboard obtenido exitosamente:`, {
        totalWorkers: result.totalWorkers,
        workersOnShift: result.workersOnShift,
        workersOffShift: result.workersOffShift,
        totalNetHoursToday: result.totalNetHoursToday,
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo dashboard:`, error);
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
    this.logger.log(`📊 GET /attendance/worker/${workerId}/history - Obteniendo historial de turnos`);
    this.logger.debug(`Worker:`, { id: workerId });
    this.logger.debug(`Query:`, query);

    try {
      const result = await this.getWorkerShiftHistoryUseCase.execute(workerId, query);
      this.logger.log(`✅ Historial obtenido exitosamente:`, {
        shiftsCount: result.shifts.length,
        dateRange: result.dateRange
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo historial:`, error);
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
    this.logger.debug(`Obteniendo auditoría de turno:`, { shiftId });

    try {
      const result = await this.getShiftAuditUseCase.execute({ shiftId });
      this.logger.log(`✅ Auditoría obtenida exitosamente:`, {
        recordsCount: result.records.length,
        riskScore: result.auditSummary.overallRiskScore
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo auditoría:`, error);
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
    this.logger.debug(`Obteniendo estadísticas detalladas:`, { workerId, query });

    try {
      const result = await this.getWorkerDetailedStatsUseCase.execute(workerId, query);
      this.logger.log(`✅ Estadísticas obtenidas exitosamente:`, {
        attendanceRate: result.attendance.attendanceRate,
        totalHours: result.hours.totalHours
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo estadísticas:`, error);
      throw error;
    }
  }

  @Get('worker/:workerId/summary')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getWorkerSummary(
    @Param('workerId') workerId: string,
    @Query(new ValidationPipe({ transform: true })) query: GetWorkerSummaryQueryDto,
    @Request() req
  ): Promise<WorkerSummaryResponseDto> {
    this.logger.debug(`Obteniendo resumen de trabajador:`, { workerId, query });

    try {
      const result = await this.getWorkerSummaryUseCase.execute(workerId, query);
      this.logger.log(`✅ Resumen obtenido exitosamente:`, {
        totalShifts: result.pagination.totalItems,
        attendanceRate: result.stats.attendanceRate,
        totalNetHours: result.stats.totalNetHours,
        page: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo resumen:`, error);
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
    this.logger.debug(`Obteniendo turnos recientes:`, { workerId });

    try {
      // Obtener últimos 5 turnos + turno activo si existe
      const result = await this.getWorkerShiftHistoryUseCase.execute(workerId, {
        limit: 5,
        offset: 0
      });
      this.logger.log(`✅ Turnos recientes obtenidos exitosamente:`, {
        shiftsCount: result.shifts.length
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo turnos recientes:`, error);
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
    this.logger.debug(`Worker obteniendo su estado:`, { workerId });

    try {
      // Obtener últimos 5 turnos + turno activo si existe
      const result = await this.getWorkerShiftHistoryUseCase.execute(workerId, {
        limit: 5,
        offset: 0
      });
      this.logger.log(`✅ Estado de turno obtenido exitosamente:`, {
        shiftsCount: result.shifts.length
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo estado de turno:`, error);
      throw error;
    }
  }
}
