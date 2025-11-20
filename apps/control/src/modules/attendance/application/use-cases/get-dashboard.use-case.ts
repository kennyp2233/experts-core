import { Injectable, Logger } from '@nestjs/common';
import { AttendanceRepositoryInterface } from '../../domain/repositories/attendance.repository.interface';
import { WorkersService } from '../../../workers/workers.service';
import { DashboardResponseDto, WorkerCardDto } from '../dto/dashboard-response.dto';

@Injectable()
export class GetDashboardUseCase {
  private readonly logger = new Logger(GetDashboardUseCase.name);

  constructor(
    private readonly attendanceRepository: AttendanceRepositoryInterface,
    private readonly workersService: WorkersService,
  ) {}

  async execute(depotId?: string): Promise<DashboardResponseDto> {
    this.logger.log(`🚀 Ejecutando caso de uso - Obtener dashboard de asistencias`);
    this.logger.debug(`DepotId:`, depotId);

    try {
      // Obtener fecha de hoy en zona horaria de Ecuador (UTC-5)
      const now = new Date();
      const ecuadorOffset = -5 * 60; // UTC-5 en minutos
      const ecuadorTime = new Date(now.getTime() + (ecuadorOffset - now.getTimezoneOffset()) * 60000);
      
      // Normalizar a inicio del día en Ecuador
      const today = new Date(ecuadorTime);
      today.setHours(0, 0, 0, 0);

      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      // Obtener todos los trabajadores del depot (o todos si no se especifica depot)
      const query = {}; // Default query parameters
      const workersResponse = depotId
        ? await this.workersService.findByDepot(depotId, query)
        : await this.workersService.findAll(query);

      const workers = workersResponse.data.items;

      this.logger.debug(`Trabajadores encontrados: ${workers.length}`);

      // Obtener asistencias de hoy para todos los trabajadores
      const todayAttendances = await this.attendanceRepository.findAttendances({
        depotId,
        dateFrom: today,
        dateTo: endOfToday,
        filterByEntryTime: true,
      });

      this.logger.debug(`Asistencias de hoy: ${todayAttendances.length}`);

      // Crear un mapa de workerId -> attendance de hoy
      const attendanceMap = new Map();
      todayAttendances.forEach(att => {
        attendanceMap.set(att.workerId, att);
      });

      // Construir tarjetas de trabajadores
      const workerCards: WorkerCardDto[] = [];
      let workersOnShift = 0;
      let totalNetHoursToday = 0;

      for (const worker of workers) {
        const attendance = attendanceMap.get(worker.id);

        const isOnShift = attendance && attendance.entryTime && !attendance.exitTime;
        const status: 'ON_SHIFT' | 'OFF_SHIFT' = isOnShift ? 'ON_SHIFT' : 'OFF_SHIFT';

        if (isOnShift) {
          workersOnShift++;
        }

        const todayNetHours = attendance?.netHours || null;
        if (todayNetHours !== null) {
          totalNetHoursToday += todayNetHours;
        }

        workerCards.push({
          workerId: worker.id,
          workerName: `${worker.firstName} ${worker.lastName}`,
          email: worker.email || undefined,
          profilePhoto: worker.profilePhoto || undefined,
          status,
          todayNetHours,
          todayEntryTime: attendance?.entryTime?.toISOString() || null,
          todayExitTime: attendance?.exitTime?.toISOString() || null,
          todayAttendanceId: attendance?.id || null,
        });
      }

      const response: DashboardResponseDto = {
        totalWorkers: workers.length,
        workersOnShift,
        workersOffShift: workers.length - workersOnShift,
        totalNetHoursToday,
        date: today.toISOString().split('T')[0], // Fecha en formato YYYY-MM-DD
        workerCards,
      };

      this.logger.log('✅ Dashboard generado exitosamente:', {
        totalWorkers: response.totalWorkers,
        workersOnShift: response.workersOnShift,
        workersOffShift: response.workersOffShift,
        totalNetHoursToday: response.totalNetHoursToday,
      });

      return response;
    } catch (error) {
      this.logger.error(`❌ Error en caso de uso:`, error);
      throw error;
    }
  }
}
