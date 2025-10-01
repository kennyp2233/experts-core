import { Injectable, Inject } from '@nestjs/common';
import type { ExceptionCodeRepositoryInterface } from '../../domain/repositories/exception-code.repository.interface';

export interface ListExceptionCodesDto {
  adminId?: string;
  limit?: number;
  offset?: number;
}

export interface ExceptionCodeListItem {
  id: string;
  code: string;
  workerId: string;
  worker: {
    employeeId: string;
    firstName: string;
    lastName: string;
  };
  status: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
}

export interface ListExceptionCodesResult {
  codes: ExceptionCodeListItem[];
  total: number;
}

@Injectable()
export class ListExceptionCodesUseCase {
  constructor(
    @Inject('ExceptionCodeRepositoryInterface')
    private readonly exceptionCodeRepository: ExceptionCodeRepositoryInterface,
  ) {}

  async execute(dto: ListExceptionCodesDto = {}): Promise<ListExceptionCodesResult> {
    const { limit = 50, offset = 0 } = dto;

    const codes = await this.exceptionCodeRepository.findExceptionCodes({
      limit,
      offset,
      orderBy: { createdAt: 'desc' }
    });

    const total = await this.exceptionCodeRepository.countExceptionCodes();

    // Enriquecer con información del worker
    const enrichedCodes = await Promise.all(
      codes.map(async (code) => {
        const worker = await this.exceptionCodeRepository.findWorkerById(code.workerId);

        return {
          id: code.id,
          code: code.code,
          workerId: code.workerId,
          worker: worker ? {
            employeeId: worker.employeeId,
            firstName: worker.firstName,
            lastName: worker.lastName,
          } : {
            employeeId: 'N/A',
            firstName: 'Worker',
            lastName: 'Not Found',
          },
          status: code.status,
          createdAt: code.createdAt,
          expiresAt: code.expiresAt,
          usedAt: code.usedAt,
        };
      })
    );

    return {
      codes: enrichedCodes,
      total,
    };
  }
}