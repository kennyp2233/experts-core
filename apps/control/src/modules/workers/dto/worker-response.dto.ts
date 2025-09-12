import { Expose, Exclude, Type } from 'class-transformer';

class DepotDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  address?: string;
}

export class WorkerResponseDto {
  @Expose()
  id: string;

  @Expose()
  employeeId: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email?: string;

  @Expose()
  phone?: string;

  @Expose()
  profilePhoto?: string;

  @Expose()
  status: string;

  @Expose()
  isAuthenticated: boolean;

  @Expose()
  lastLoginAt?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => DepotDto)
  depot?: DepotDto;

  @Expose()
  attendancesCount?: number;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  depotId: string;
}

export class PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class WorkersListResponseDto {
  success: boolean;
  data: {
    items: WorkerResponseDto[];
    pagination: PaginationDto;
  };
  message?: string;
}

export class WorkerCreateResponseDto {
  success: boolean;
  data: WorkerResponseDto;
  message: string;
}

export class WorkerUpdateResponseDto {
  success: boolean;
  data: WorkerResponseDto;
  message: string;
}

export class WorkerDeleteResponseDto {
  success: boolean;
  message: string;
}

// DTO para el estado del turno del trabajador
export class WorkerShiftStatusDto {
  @Expose()
  isOnShift: boolean;

  @Expose()
  currentShiftId?: string;

  @Expose()
  lastAction?: 'ENTRY' | 'EXIT';

  @Expose()
  lastActionTimestamp?: Date;
}

export class WorkerShiftStatusResponseDto {
  success: boolean;
  data: WorkerShiftStatusDto;
  message?: string;
}
