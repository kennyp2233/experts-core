import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';
import type { WorkerAuthRepositoryInterface } from '../../domain/repositories/worker-auth.repository.interface';
import type { 
  CreateLoginQRParams, 
  CreateDeviceParams, 
  UpdateDeviceSessionParams 
} from '../../domain/repositories/worker-auth.repository.interface';
import { LoginQREntity } from '../../domain/entities/login-qr.entity';
import { WorkerSessionEntity } from '../../domain/entities/worker-session.entity';
import { QRLoginToken } from '../../domain/value-objects/qr-login-token.vo';
import { SessionToken } from '../../domain/value-objects/session-token.vo';
import { LoginQRStatus } from '../../domain/enums/login-qr-status.enum';
import { SessionStatus } from '../../domain/enums/session-status.enum';

@Injectable()
export class WorkerAuthRepository implements WorkerAuthRepositoryInterface {
  constructor(private prisma: PrismaService) {}

  async findWorkerById(id: string): Promise<any> {
    return this.prisma.worker.findUnique({
      where: { id },
      include: {
        depot: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async updateWorkerAuthentication(workerId: string, isAuthenticated: boolean): Promise<void> {
    await this.prisma.worker.update({
      where: { id: workerId },
      data: { 
        isAuthenticated,
        lastLoginAt: isAuthenticated ? new Date() : undefined
      }
    });
  }

  async createLoginQR(params: CreateLoginQRParams): Promise<LoginQREntity> {
    console.log('[DEBUG] Backend - Creando QR en BD con params:', {
      qrToken: params.qrToken,
      qrTokenLength: params.qrToken.length,
      workerId: params.workerId,
      adminId: params.adminId,
      status: params.status,
      expiresAt: params.expiresAt
    });

    const qr = await this.prisma.workerLoginQR.create({
      data: {
        qrToken: params.qrToken,
        shortCode: params.shortCode,
        workerId: params.workerId,
        adminId: params.adminId,
        status: params.status,
        expiresAt: params.expiresAt
      },
      include: {
        worker: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('[DEBUG] Backend - QR creado en BD:', {
      id: qr.id,
      qrToken: qr.qrToken,
      qrTokenLength: qr.qrToken.length,
      shortCode: qr.shortCode,
      workerId: qr.workerId,
      adminId: qr.adminId,
      status: qr.status
    });

    const entity = new LoginQREntity(
      qr.id,
      QRLoginToken.fromValue(qr.qrToken),
      qr.workerId,
      qr.adminId,
      qr.status as LoginQRStatus,
      qr.createdAt,
      qr.expiresAt || undefined,
      qr.usedAt || undefined,
      qr.updatedAt,
      qr.shortCode || undefined
    );

    console.log('[DEBUG] Backend - Entidad LoginQREntity creada:', {
      id: entity.id,
      qrToken: entity.qrToken.getValue(),
      shortCode: entity.shortCode,
      workerId: entity.workerId,
      status: entity.status
    });

    return entity;
  }

  async findQRByToken(qrToken: string): Promise<LoginQREntity | null> {
    const qr = await this.prisma.workerLoginQR.findUnique({
      where: { qrToken },
      include: {
        worker: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            status: true
          }
        }
      }
    });

    if (!qr) {
      return null;
    }

    return new LoginQREntity(
      qr.id,
      QRLoginToken.fromValue(qr.qrToken),
      qr.workerId,
      qr.adminId,
      qr.status as LoginQRStatus,
      qr.createdAt,
      qr.expiresAt || undefined,
      qr.usedAt || undefined,
      qr.updatedAt,
      qr.shortCode || undefined
    );
  }

  async findQRByShortCode(shortCode: string): Promise<LoginQREntity | null> {
    const qr = await this.prisma.workerLoginQR.findUnique({
      where: { shortCode },
      include: {
        worker: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            status: true
          }
        }
      }
    });

    if (!qr) {
      return null;
    }

    return new LoginQREntity(
      qr.id,
      QRLoginToken.fromValue(qr.qrToken),
      qr.workerId,
      qr.adminId,
      qr.status as LoginQRStatus,
      qr.createdAt,
      qr.expiresAt || undefined,
      qr.usedAt || undefined,
      qr.updatedAt,
      qr.shortCode || undefined
    );
  }

  async updateQRStatus(qrId: string, status: LoginQRStatus, usedAt?: Date): Promise<void> {
    await this.prisma.workerLoginQR.update({
      where: { id: qrId },
      data: { 
        status,
        usedAt,
        updatedAt: new Date()
      }
    });
  }

  async expireWorkerQRs(workerId: string): Promise<void> {
    await this.prisma.workerLoginQR.updateMany({
      where: { 
        workerId,
        status: LoginQRStatus.PENDING
      },
      data: { 
        status: LoginQRStatus.EXPIRED,
        updatedAt: new Date()
      }
    });
  }

  async getAllActiveQRs(): Promise<any[]> {
    return this.prisma.workerLoginQR.findMany({
      where: {
        status: LoginQRStatus.PENDING,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        qrToken: true,
        workerId: true,
        status: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findDeviceByDeviceId(deviceId: string): Promise<any> {
    return this.prisma.device.findUnique({
      where: { deviceId },
      include: {
        worker: {
          include: {
            depot: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }

  async findDeviceBySessionToken(sessionToken: string): Promise<any> {
    return this.prisma.device.findUnique({
      where: { sessionToken },
      include: {
        worker: {
          include: {
            depot: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }

  async createDevice(params: CreateDeviceParams): Promise<any> {
    return this.prisma.device.create({
      data: {
        deviceId: params.deviceId,
        workerId: params.workerId,
        model: params.model,
        platform: params.platform,
        appVersion: params.appVersion
      },
      include: {
        worker: {
          include: {
            depot: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }

  async updateDevice(deviceId: string, params: Partial<CreateDeviceParams>): Promise<any> {
    console.log('[DEBUG] Backend - Actualizando device:', { deviceId, params });
    
    return this.prisma.device.update({
      where: { deviceId },
      data: {
        ...(params.workerId && { workerId: params.workerId }),
        ...(params.model && { model: params.model }),
        ...(params.platform && { platform: params.platform }),
        ...(params.appVersion && { appVersion: params.appVersion }),
        updatedAt: new Date()
      },
      include: {
        worker: {
          include: {
            depot: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }

  async updateDeviceSession(deviceId: string, params: UpdateDeviceSessionParams): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        isLoggedIn: params.isLoggedIn,
        sessionToken: params.sessionToken,
        lastActivityAt: params.lastActivityAt,
        sessionExpiry: params.sessionExpiry
      }
    });
  }

  async updateDeviceActivity(deviceId: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastActivityAt: new Date() }
    });
  }

  async findActiveSessionsByWorker(workerId: string): Promise<WorkerSessionEntity[]> {
    const devices = await this.prisma.device.findMany({
      where: { 
        workerId,
        isLoggedIn: true,
        sessionToken: { not: null }
      },
      include: {
        worker: true
      }
    });

    return devices.map(device => new WorkerSessionEntity(
      device.id,
      device.workerId,
      device.id,
      new SessionToken(device.sessionToken!),
      SessionStatus.ACTIVE,
      device.worker.lastLoginAt || new Date(),
      device.lastActivityAt || new Date(),
      {
        deviceId: device.deviceId,
        model: device.model || undefined,
        platform: device.platform || '',
        appVersion: device.appVersion || ''
      },
      device.sessionExpiry || undefined
    ));
  }

  async revokeSession(sessionToken: string): Promise<void> {
    await this.prisma.device.updateMany({
      where: { sessionToken },
      data: {
        isLoggedIn: false,
        sessionToken: null,
        sessionExpiry: null
      }
    });
  }

  async getActiveSessions(): Promise<WorkerSessionEntity[]> {
    const devices = await this.prisma.device.findMany({
      where: {
        isLoggedIn: true,
        sessionToken: { not: null }
      },
      include: {
        worker: {
          include: {
            depot: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    return devices.map(device => new WorkerSessionEntity(
      device.id,
      device.workerId,
      device.id,
      new SessionToken(device.sessionToken!),
      SessionStatus.ACTIVE,
      device.worker.lastLoginAt || new Date(),
      device.lastActivityAt || new Date(),
      {
        deviceId: device.deviceId,
        model: device.model || undefined,
        platform: device.platform || '',
        appVersion: device.appVersion || ''
      },
      device.sessionExpiry || undefined
    ));
  }

  async validateAdminPermissions(adminId: string): Promise<boolean> {
    const admin = await this.prisma.admin.findUnique({
      where: { 
        id: adminId,
        isActive: true
      }
    });

    return !!admin && ['SUPER_ADMIN', 'SUPERVISOR'].includes(admin.role);
  }
}
