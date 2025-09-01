import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

export interface DepotStats {
  totalWorkers: number;
  activeWorkers: number;
  suspendedWorkers: number;
  inactiveWorkers: number;
  attendancesToday: number;
  attendancesThisWeek: number;
  attendancesThisMonth: number;
  averageWorkersPerDay: number;
  lastAttendanceAt: Date | null;
}

@Injectable()
export class DepotStatsService {
  constructor(private prisma: PrismaService) {}

  async getDepotStats(depotId: string): Promise<DepotStats> {
    // Verificar que el depot existe
    const depot = await this.prisma.depot.findUnique({
      where: { id: depotId }
    });

    if (!depot) {
      throw new NotFoundException(`Depot con ID ${depotId} no encontrado`);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Estadísticas de workers
    const workersStats = await this.prisma.worker.groupBy({
      by: ['status'],
      where: { depotId },
      _count: true
    });

    const totalWorkers = workersStats.reduce((sum, stat) => sum + stat._count, 0);
    const activeWorkers = workersStats.find(stat => stat.status === 'ACTIVE')?._count || 0;
    const suspendedWorkers = workersStats.find(stat => stat.status === 'SUSPENDED')?._count || 0;
    const inactiveWorkers = workersStats.find(stat => stat.status === 'INACTIVE')?._count || 0;

    // Estadísticas de asistencias
    const [attendancesToday, attendancesThisWeek, attendancesThisMonth, lastAttendance] = await Promise.all([
      this.prisma.attendance.count({
        where: {
          depotId,
          createdAt: { gte: startOfToday }
        }
      }),
      this.prisma.attendance.count({
        where: {
          depotId,
          createdAt: { gte: startOfWeek }
        }
      }),
      this.prisma.attendance.count({
        where: {
          depotId,
          createdAt: { gte: startOfMonth }
        }
      }),
      this.prisma.attendance.findFirst({
        where: { depotId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    // Calcular promedio de workers por día (últimos 30 días)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const dailyAttendances = await this.prisma.attendance.groupBy({
      by: ['createdAt'],
      where: {
        depotId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { workerId: true }
    });

    const averageWorkersPerDay = dailyAttendances.length > 0
      ? dailyAttendances.reduce((sum, day) => sum + day._count.workerId, 0) / dailyAttendances.length
      : 0;

    return {
      totalWorkers,
      activeWorkers,
      suspendedWorkers,
      inactiveWorkers,
      attendancesToday,
      attendancesThisWeek,
      attendancesThisMonth,
      averageWorkersPerDay: Math.round(averageWorkersPerDay * 100) / 100,
      lastAttendanceAt: lastAttendance?.createdAt || null
    };
  }

  async getMultipleDepotsStats(depotIds: string[]): Promise<Record<string, DepotStats>> {
    const results: Record<string, DepotStats> = {};
    
    for (const depotId of depotIds) {
      try {
        results[depotId] = await this.getDepotStats(depotId);
      } catch (error) {
        // Skip invalid depots
        continue;
      }
    }
    
    return results;
  }
}
