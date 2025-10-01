import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';
import { 
  AttendanceRepositoryInterface,
  CreateAttendanceData,
  CreateAttendanceRecordData,
  UpdateAttendanceData,
  UpdateAttendanceRecordData,
  AttendanceFilter,
  AttendanceRecordFilter,
  AttendanceWithRecords,
} from '../../domain/repositories/attendance.repository.interface';
import { AttendanceEntity } from '../../domain/entities/attendance.entity';
import { AttendanceRecordEntity } from '../../domain/entities/attendance-record.entity';
import { GPSCoordinate } from '../../domain/value-objects/gps-coordinate.vo';
import { PhotoMetadata } from '../../domain/value-objects/photo-metadata.vo';
import { FraudScore } from '../../domain/value-objects/fraud-score.vo';
import { FraudReason } from '../../domain/enums/fraud-reason.enum';

@Injectable()
export class AttendanceRepository implements AttendanceRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  // Attendance CRUD
  async createAttendance(data: CreateAttendanceData): Promise<AttendanceEntity> {
    console.log('[AttendanceRepository] 📅 Creando attendance');
    console.log('[AttendanceRepository] Datos recibidos:', {
      date: data.date,
      entryTime: data.entryTime,
      exitTime: data.exitTime,
      workerId: data.workerId,
      depotId: data.depotId
    });

    // Normalize date to start of day
    const normalizedDate = new Date(data.date);
    normalizedDate.setHours(0, 0, 0, 0);

    const totalHours = this.calculateTotalHours(data.entryTime || null, data.exitTime || null);
    const isComplete = data.entryTime !== undefined && data.exitTime !== undefined;

    try {
      const attendance = await this.prisma.attendance.create({
        data: {
          date: normalizedDate,
          entryTime: data.entryTime || null,
          exitTime: data.exitTime || null,
          totalHours,
          isComplete,
          notes: data.notes || null,
          workerId: data.workerId,
          depotId: data.depotId,
        },
      });

      console.log('[AttendanceRepository] ✅ Attendance creado exitosamente:', {
        id: attendance.id,
        date: attendance.date,
        entryTime: attendance.entryTime,
        exitTime: attendance.exitTime,
        isComplete: attendance.isComplete
      });

      return this.toDomainAttendance(attendance);
    } catch (error) {
      console.error('[AttendanceRepository] ❌ Error creando attendance:', error);
      throw error;
    }
  }

  async findAttendanceById(id: string): Promise<AttendanceEntity | null> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    return attendance ? this.toDomainAttendance(attendance) : null;
  }

  async findAttendanceByWorkerAndDate(workerId: string, date: Date): Promise<AttendanceEntity | null> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        workerId,
        date: normalizedDate,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return attendance ? this.toDomainAttendance(attendance) : null;
  }

  async updateAttendance(id: string, data: UpdateAttendanceData): Promise<AttendanceEntity> {
    const updateData: any = { ...data };
    
    // Recalculate total hours if entry or exit time changed
    if (data.entryTime !== undefined || data.exitTime !== undefined) {
      const current = await this.prisma.attendance.findUnique({ where: { id } });
      if (current) {
        const newEntryTime = data.entryTime !== undefined ? data.entryTime : current.entryTime;
        const newExitTime = data.exitTime !== undefined ? data.exitTime : current.exitTime;
        
        updateData.totalHours = this.calculateTotalHours(newEntryTime, newExitTime);
        updateData.isComplete = newEntryTime !== null && newExitTime !== null;
      }
    }

    const attendance = await this.prisma.attendance.update({
      where: { id },
      data: updateData,
    });

    return this.toDomainAttendance(attendance);
  }

  async deleteAttendance(id: string): Promise<void> {
    await this.prisma.attendance.delete({
      where: { id },
    });
  }

  // Attendance queries
  async findAttendances(filter: AttendanceFilter, limit: number = 50, offset: number = 0): Promise<AttendanceEntity[]> {
    const where: any = {};

    if (filter.workerId) where.workerId = filter.workerId;
    if (filter.depotId) where.depotId = filter.depotId;
    if (filter.isComplete !== undefined) where.isComplete = filter.isComplete;
    
    if (filter.dateFrom || filter.dateTo) {
      where.date = {};
      if (filter.dateFrom) where.date.gte = filter.dateFrom;
      if (filter.dateTo) {
        // Incluir todo el día final agregando 23:59:59.999
        const endOfDay = new Date(filter.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.date.lte = endOfDay;
      }
    }

    if (filter.isActive) {
      where.entryTime = { not: null };
      where.exitTime = null;
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    return attendances.map(this.toDomainAttendance);
  }

  async findAttendanceWithRecords(id: string): Promise<AttendanceWithRecords | null> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!attendance) return null;

    const attendanceEntity = this.toDomainAttendance(attendance);
    const recordEntities = attendance.records.map(this.toDomainAttendanceRecord);

    return {
      ...attendanceEntity,
      records: recordEntities,
    } as AttendanceWithRecords;
  }

  async findIncompleteAttendances(dateFrom?: Date, dateTo?: Date): Promise<AttendanceEntity[]> {
    const where: any = {
      isComplete: false,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = dateFrom;
      if (dateTo) where.date.lte = dateTo;
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return attendances.map(this.toDomainAttendance);
  }

  async findActiveAttendanceByWorker(workerId: string): Promise<AttendanceEntity | null> {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        workerId,
        entryTime: { not: null },
        exitTime: null,
      },
      orderBy: { date: 'desc' },
    });

    return attendance ? this.toDomainAttendance(attendance) : null;
  }

  async findWorkerAttendanceHistory(workerId: string, limit: number = 30, offset: number = 0): Promise<AttendanceEntity[]> {
    const attendances = await this.prisma.attendance.findMany({
      where: { workerId },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    return attendances.map(this.toDomainAttendance);
  }

  // Attendance Record CRUD
  async createAttendanceRecord(data: CreateAttendanceRecordData): Promise<AttendanceRecordEntity> {
    console.log('[AttendanceRepository] 💾 Creando registro de attendance record');
    console.log('[AttendanceRepository] Datos recibidos:', {
      type: data.type,
      timestamp: data.timestamp,
      status: data.status,
      workerId: data.workerId,
      attendanceId: data.attendanceId,
      photoPath: data.photoPath,
      location: { latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy },
      createdOffline: data.createdOffline
    });

    try {
      // Verificar que el worker existe antes de crear el record
      console.log('[AttendanceRepository] Verificando que el worker existe...');
      const workerExists = await this.prisma.worker.findUnique({
        where: { id: data.workerId },
        select: { id: true, firstName: true, lastName: true }
      });
      
      if (!workerExists) {
        console.error('[AttendanceRepository] ❌ Worker no encontrado:', data.workerId);
        throw new Error(`Worker with ID ${data.workerId} not found`);
      }
      
      console.log('[AttendanceRepository] ✅ Worker encontrado:', workerExists);

      // Verificar que el device existe
      console.log('[AttendanceRepository] Verificando que el device existe...');
      const deviceExists = await this.prisma.device.findUnique({
        where: { id: data.deviceId },
        select: { id: true, deviceId: true }
      });
      
      if (!deviceExists) {
        console.error('[AttendanceRepository] ❌ Device no encontrado:', data.deviceId);
        throw new Error(`Device with ID ${data.deviceId} not found`);
      }
      
      console.log('[AttendanceRepository] ✅ Device encontrado:', deviceExists);

      const record = await this.prisma.attendanceRecord.create({
        data: {
          type: data.type,
          timestamp: data.timestamp,
          status: data.status,
          qrCodeUsed: data.qrCodeUsed,
          exceptionCode: data.exceptionCode,
          photoPath: data.photoPath,
          photoMetadata: data.photoMetadata || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          accuracy: data.accuracy || null,
          validationErrors: data.validationErrors || null,
          processedAt: data.processedAt || null,
          createdOffline: data.createdOffline,
          syncedAt: data.syncedAt || null,
          workerId: data.workerId,
          deviceId: data.deviceId,
          attendanceId: data.attendanceId,
        },
      });

      console.log('[AttendanceRepository] ✅ Registro creado exitosamente:', {
        id: record.id,
        type: record.type,
        status: record.status,
        timestamp: record.timestamp
      });

      return this.toDomainAttendanceRecord(record);
    } catch (error) {
      console.error('[AttendanceRepository] ❌ Error creando registro:', error);
      throw error;
    }
  }

  async findAttendanceRecordById(id: string): Promise<AttendanceRecordEntity | null> {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
    });

    return record ? this.toDomainAttendanceRecord(record) : null;
  }

  async updateAttendanceRecord(id: string, data: UpdateAttendanceRecordData): Promise<AttendanceRecordEntity> {
    const record = await this.prisma.attendanceRecord.update({
      where: { id },
      data,
    });

    return this.toDomainAttendanceRecord(record);
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    await this.prisma.attendanceRecord.delete({
      where: { id },
    });
  }

  // Attendance Record queries
  async findAttendanceRecords(filter: AttendanceRecordFilter, limit: number = 50, offset: number = 0): Promise<AttendanceRecordEntity[]> {
    const where: any = {};

    if (filter.workerId) where.workerId = filter.workerId;
    if (filter.deviceId) where.deviceId = filter.deviceId;
    if (filter.attendanceId) where.attendanceId = filter.attendanceId;
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.createdOffline !== undefined) where.createdOffline = filter.createdOffline;

    if (filter.dateFrom || filter.dateTo) {
      where.timestamp = {};
      if (filter.dateFrom) where.timestamp.gte = filter.dateFrom;
      if (filter.dateTo) where.timestamp.lte = filter.dateTo;
    }

    if (filter.needsManualReview) {
      where.OR = [
        { status: 'SUSPICIOUS' },
        { fraudScore: { gte: 40 } },
      ];
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    return records.map(this.toDomainAttendanceRecord);
  }

  async findRecordsByAttendance(attendanceId: string): Promise<AttendanceRecordEntity[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { attendanceId },
      orderBy: { timestamp: 'asc' },
    });

    return records.map(this.toDomainAttendanceRecord);
  }

  async findPendingValidationRecords(limit: number = 100): Promise<AttendanceRecordEntity[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        status: 'PENDING',
        processedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return records.map(this.toDomainAttendanceRecord);
  }

  async findSuspiciousRecords(dateFrom?: Date, dateTo?: Date): Promise<AttendanceRecordEntity[]> {
    const where: any = {
      OR: [
        { status: 'SUSPICIOUS' },
        { fraudScore: { gte: 40 } },
      ],
    };

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = dateFrom;
      if (dateTo) where.timestamp.lte = dateTo;
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return records.map(this.toDomainAttendanceRecord);
  }

  async findOfflineRecords(workerId?: string, synced?: boolean): Promise<AttendanceRecordEntity[]> {
    const where: any = {
      createdOffline: true,
    };

    if (workerId) where.workerId = workerId;
    if (synced !== undefined) {
      where.syncedAt = synced ? { not: null } : null;
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return records.map(this.toDomainAttendanceRecord);
  }

  async findLastRecordByWorker(workerId: string, beforeTime?: Date): Promise<AttendanceRecordEntity | null> {
    const where: any = { workerId };
    
    if (beforeTime) {
      where.timestamp = { lt: beforeTime };
    }

    const record = await this.prisma.attendanceRecord.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return record ? this.toDomainAttendanceRecord(record) : null;
  }

  // Statistics and analytics
  async getWorkerAttendanceStats(workerId: string, dateFrom: Date, dateTo: Date): Promise<{
    totalDays: number;
    completeDays: number;
    incompleteDays: number;
    totalHours: number;
    averageHoursPerDay: number;
    earliestEntry: Date | null;
    latestExit: Date | null;
  }> {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        workerId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    });

    const totalDays = attendances.length;
    const completeDays = attendances.filter(a => a.isComplete).length;
    const incompleteDays = totalDays - completeDays;
    
    const totalHours = attendances.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    const entryTimes = attendances.filter(a => a.entryTime).map(a => a.entryTime!);
    const exitTimes = attendances.filter(a => a.exitTime).map(a => a.exitTime!);

    const earliestEntry = entryTimes.length > 0 ? new Date(Math.min(...entryTimes.map(t => t.getTime()))) : null;
    const latestExit = exitTimes.length > 0 ? new Date(Math.max(...exitTimes.map(t => t.getTime()))) : null;

    return {
      totalDays,
      completeDays,
      incompleteDays,
      totalHours,
      averageHoursPerDay,
      earliestEntry,
      latestExit,
    };
  }

  async getDepotAttendanceStats(depotId: string, date: Date): Promise<{
    totalWorkers: number;
    presentWorkers: number;
    activeWorkers: number;
    completedShifts: number;
    totalHours: number;
  }> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        depotId,
        date: normalizedDate,
      },
    });

    const totalWorkers = attendances.length;
    const presentWorkers = attendances.filter(a => a.entryTime).length;
    const activeWorkers = attendances.filter(a => a.entryTime && !a.exitTime).length;
    const completedShifts = attendances.filter(a => a.isComplete).length;
    const totalHours = attendances.reduce((sum, a) => sum + (a.totalHours || 0), 0);

    return {
      totalWorkers,
      presentWorkers,
      activeWorkers,
      completedShifts,
      totalHours,
    };
  }

  async getFraudStats(dateFrom: Date, dateTo: Date): Promise<{
    totalRecords: number;
    acceptedRecords: number;
    suspiciousRecords: number;
    rejectedRecords: number;
    averageFraudScore: number;
    topFraudReasons: Array<{ reason: string; count: number }>;
  }> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        timestamp: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    });

    const totalRecords = records.length;
    const acceptedRecords = records.filter(r => r.status === 'ACCEPTED').length;
    const suspiciousRecords = records.filter(r => r.status === 'SUSPICIOUS').length;
    const rejectedRecords = records.filter(r => r.status === 'REJECTED').length;

    const fraudScores: number[] = [];
    
    // Extract fraud scores from validation errors
    records.forEach(record => {
      if (record.validationErrors) {
        try {
          const errors = JSON.parse(record.validationErrors);
          const totalScore = errors.reduce((sum: number, error: any) => sum + (error.severity || 0), 0);
          if (totalScore > 0) {
            fraudScores.push(totalScore);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    });
    
    const averageFraudScore = fraudScores.length > 0 ? fraudScores.reduce((sum, score) => sum + score, 0) / fraudScores.length : 0;

    // Extract top fraud reasons (this would need proper parsing of validation errors)
    const topFraudReasons: Array<{ reason: string; count: number }> = [];

    return {
      totalRecords,
      acceptedRecords,
      suspiciousRecords,
      rejectedRecords,
      averageFraudScore,
      topFraudReasons,
    };
  }

  // Bulk operations
  async createMultipleRecords(records: CreateAttendanceRecordData[]): Promise<AttendanceRecordEntity[]> {
    const createdRecords = await this.prisma.$transaction(
      records.map(data => this.prisma.attendanceRecord.create({ data }))
    );

    return createdRecords.map(this.toDomainAttendanceRecord);
  }

  async updateMultipleRecords(updates: Array<{ id: string; data: UpdateAttendanceRecordData }>): Promise<AttendanceRecordEntity[]> {
    const updatedRecords = await this.prisma.$transaction(
      updates.map(update => this.prisma.attendanceRecord.update({
        where: { id: update.id },
        data: update.data,
      }))
    );

    return updatedRecords.map(this.toDomainAttendanceRecord);
  }

  // Cleanup and maintenance
  async cleanupOldRecords(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.attendanceRecord.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: ['ACCEPTED', 'REJECTED'],
        },
      },
    });

    return result.count;
  }

  async recalculateAttendanceHours(attendanceId: string): Promise<AttendanceEntity> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new Error('Attendance not found');
    }

    const totalHours = this.calculateTotalHours(attendance.entryTime, attendance.exitTime);
    const isComplete = attendance.entryTime !== null && attendance.exitTime !== null;

    const updated = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        totalHours,
        isComplete,
      },
    });

    return this.toDomainAttendance(updated);
  }

  async recalculateAllHours(dateFrom: Date, dateTo: Date): Promise<number> {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    });

    let updateCount = 0;

    for (const attendance of attendances) {
      const totalHours = this.calculateTotalHours(attendance.entryTime, attendance.exitTime);
      const isComplete = attendance.entryTime !== null && attendance.exitTime !== null;

      if (attendance.totalHours !== totalHours || attendance.isComplete !== isComplete) {
        await this.prisma.attendance.update({
          where: { id: attendance.id },
          data: { totalHours, isComplete },
        });
        updateCount++;
      }
    }

    return updateCount;
  }

  // Helper methods
  private calculateTotalHours(entryTime: Date | null, exitTime: Date | null): number | null {
    if (!entryTime || !exitTime) return null;

    let diffMs = exitTime.getTime() - entryTime.getTime();
    
    // Handle overnight shifts
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000;
    }

    return diffMs / (1000 * 60 * 60);
  }

  private toDomainAttendance = (attendance: any): AttendanceEntity => {
    return AttendanceEntity.fromPersistence({
      id: attendance.id,
      date: attendance.date,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      totalHours: attendance.totalHours,
      isComplete: attendance.isComplete,
      notes: attendance.notes,
      workerId: attendance.workerId,
      depotId: attendance.depotId,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
    });
  };

  private toDomainAttendanceRecord = (record: any): AttendanceRecordEntity => {
    // Parse GPS coordinate if available
    let gpsCoordinate: GPSCoordinate | null = null;
    if (record.latitude !== null && record.longitude !== null && record.accuracy !== null) {
      gpsCoordinate = GPSCoordinate.create(
        record.latitude,
        record.longitude,
        record.accuracy,
        record.timestamp,
      );
    }

    // Parse photo metadata if available
    let photoMetadata: PhotoMetadata | null = null;
    if (record.photoMetadata) {
      try {
        photoMetadata = PhotoMetadata.fromJSON(record.photoMetadata);
      } catch (error) {
        console.warn('Failed to parse photo metadata:', error);
      }
    }

    // Parse fraud score if available
    let fraudScore: FraudScore | null = null;
    if (record.validationErrors) {
      try {
        const errors = JSON.parse(record.validationErrors);
        const violations = errors.map((error: any) => ({
          reason: error.reason as FraudReason,
          severity: error.severity || 0,
          details: error.details,
        }));
        fraudScore = FraudScore.createFromViolations(violations);
      } catch (error) {
        // Fallback: create empty fraud score
        fraudScore = FraudScore.createClean();
      }
    }

    return AttendanceRecordEntity.fromPersistence({
      id: record.id,
      type: record.type,
      timestamp: record.timestamp,
      status: record.status,
      qrCodeUsed: record.qrCodeUsed,
      exceptionCode: record.exceptionCode,
      photoPath: record.photoPath,
      photoMetadata,
      gpsCoordinate,
      validationErrors: record.validationErrors,
      fraudScore,
      processedAt: record.processedAt,
      createdOffline: record.createdOffline,
      syncedAt: record.syncedAt,
      workerId: record.workerId,
      deviceId: record.deviceId,
      attendanceId: record.attendanceId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  };
}
