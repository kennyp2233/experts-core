import { ExceptionCodeEntity } from '../entities/exception-code.entity';
import { ExceptionCodeStatus } from '../enums/exception-code-status.enum';

export interface CreateExceptionCodeParams {
  code: string;
  workerId: string;
  adminId: string;
  expiresAt: Date;
  status: ExceptionCodeStatus;
}

export interface FindExceptionCodesParams {
  limit?: number;
  offset?: number;
  orderBy?: { [key: string]: 'asc' | 'desc' };
  status?: ExceptionCodeStatus;
  workerId?: string;
}

export interface ExceptionCodeRepositoryInterface {
  createExceptionCode(params: CreateExceptionCodeParams): Promise<ExceptionCodeEntity>;
  findExceptionCodeByCode(code: string): Promise<ExceptionCodeEntity | null>;
  findExceptionCodes(params?: FindExceptionCodesParams): Promise<ExceptionCodeEntity[]>;
  countExceptionCodes(params?: Partial<FindExceptionCodesParams>): Promise<number>;
  findExceptionCodesByWorker(workerId: string): Promise<ExceptionCodeEntity[]>;
  updateExceptionCodeStatus(codeId: string, status: ExceptionCodeStatus, usedAt?: Date): Promise<void>;
  expireWorkerExceptionCodes(workerId: string): Promise<void>;
  validateAdminPermissions(adminId: string): Promise<boolean>;
  findWorkerById(id: string): Promise<any>;
}