import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';
import { ExceptionCodeEntity } from '../../domain/entities/exception-code.entity';
import { ExceptionCodeStatus } from '../../domain/enums/exception-code-status.enum';
import {
  ExceptionCodeRepositoryInterface,
  CreateExceptionCodeParams,
  FindExceptionCodesParams
} from '../../domain/repositories/exception-code.repository.interface';

@Injectable()
export class ExceptionCodeRepository implements ExceptionCodeRepositoryInterface {
  private readonly logger = new Logger(ExceptionCodeRepository.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: any, // Usando any por simplicidad, debería ser PrismaClient
  ) {}

  async createExceptionCode(params: CreateExceptionCodeParams): Promise<ExceptionCodeEntity> {
    this.logger.debug('Creando código de excepción:', {
      code: params.code,
      workerId: params.workerId,
      adminId: params.adminId,
      expiresAt: params.expiresAt,
      status: params.status
    });

    const exceptionCode = await this.prisma.exceptionCode.create({
      data: {
        code: params.code,
        workerId: params.workerId,
        adminId: params.adminId,
        expiresAt: params.expiresAt,
        status: params.status,
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

    this.logger.debug('Código de excepción creado:', {
      id: exceptionCode.id,
      code: exceptionCode.code,
      workerId: exceptionCode.workerId,
      status: exceptionCode.status
    });

    return new ExceptionCodeEntity(
      exceptionCode.id,
      exceptionCode.code,
      exceptionCode.workerId,
      exceptionCode.adminId,
      exceptionCode.status as ExceptionCodeStatus,
      exceptionCode.expiresAt,
      exceptionCode.createdAt,
      exceptionCode.usedAt || undefined,
      exceptionCode.updatedAt
    );
  }

  async findExceptionCodeByCode(code: string): Promise<ExceptionCodeEntity | null> {
    const exceptionCode = await this.prisma.exceptionCode.findUnique({
      where: { code },
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

    if (!exceptionCode) {
      return null;
    }

    return new ExceptionCodeEntity(
      exceptionCode.id,
      exceptionCode.code,
      exceptionCode.workerId,
      exceptionCode.adminId,
      exceptionCode.status as ExceptionCodeStatus,
      exceptionCode.expiresAt,
      exceptionCode.createdAt,
      exceptionCode.usedAt || undefined,
      exceptionCode.updatedAt
    );
  }

  async findExceptionCodes(params: FindExceptionCodesParams = {}): Promise<ExceptionCodeEntity[]> {
    const { limit = 50, offset = 0, orderBy = { createdAt: 'desc' }, status, workerId } = params;

    const where: any = {};
    if (status) where.status = status;
    if (workerId) where.workerId = workerId;

    const exceptionCodes = await this.prisma.exceptionCode.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
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

    return exceptionCodes.map(ec => new ExceptionCodeEntity(
      ec.id,
      ec.code,
      ec.workerId,
      ec.adminId,
      ec.status as ExceptionCodeStatus,
      ec.expiresAt,
      ec.createdAt,
      ec.usedAt || undefined,
      ec.updatedAt
    ));
  }

  async countExceptionCodes(params: Partial<FindExceptionCodesParams> = {}): Promise<number> {
    const { status, workerId } = params;

    const where: any = {};
    if (status) where.status = status;
    if (workerId) where.workerId = workerId;

    return this.prisma.exceptionCode.count({ where });
  }

  async findExceptionCodesByWorker(workerId: string): Promise<ExceptionCodeEntity[]> {
    const exceptionCodes = await this.prisma.exceptionCode.findMany({
      where: { workerId },
      orderBy: { createdAt: 'desc' }
    });

    return exceptionCodes.map(ec => new ExceptionCodeEntity(
      ec.id,
      ec.code,
      ec.workerId,
      ec.adminId,
      ec.status as ExceptionCodeStatus,
      ec.expiresAt,
      ec.createdAt,
      ec.usedAt || undefined,
      ec.updatedAt
    ));
  }

  async updateExceptionCodeStatus(codeId: string, status: ExceptionCodeStatus, usedAt?: Date): Promise<void> {
    await this.prisma.exceptionCode.update({
      where: { id: codeId },
      data: {
        status,
        usedAt,
        updatedAt: new Date()
      }
    });
  }

  async expireWorkerExceptionCodes(workerId: string): Promise<void> {
    await this.prisma.exceptionCode.updateMany({
      where: {
        workerId,
        status: ExceptionCodeStatus.PENDING
      },
      data: {
        status: ExceptionCodeStatus.EXPIRED,
        updatedAt: new Date()
      }
    });
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
}