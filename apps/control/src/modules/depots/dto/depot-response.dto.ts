import { Expose, Exclude } from 'class-transformer';

export class DepotResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  address?: string;

  @Expose()
  latitude: number;

  @Expose()
  longitude: number;

  @Expose()
  radius: number;

  @Expose()
  isActive: boolean;

  @Expose()
  secretUpdatedAt: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Información adicional según contexto
  @Expose()
  workersCount?: number;

  @Expose()
  activeWorkersCount?: number;

  @Expose()
  attendancesToday?: number;

  @Expose()
  distanceKm?: number; // Solo en búsquedas geográficas

  // Excluir secreto de todas las respuestas
  @Exclude()
  secret: string;
}

export class PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class DepotsListResponseDto {
  success: boolean;
  data: {
    items: DepotResponseDto[];
    pagination: PaginationDto;
  };
  message?: string;
}

export class DepotCreateResponseDto {
  success: boolean;
  data: DepotResponseDto;
  message: string;
}

export class DepotUpdateResponseDto {
  success: boolean;
  data: DepotResponseDto;
  message: string;
}

export class DepotDeleteResponseDto {
  success: boolean;
  message: string;
}

export class RegenerateSecretResponseDto {
  success: boolean;
  data: {
    id: string;
    secretUpdatedAt: Date;
    message: string;
  };
  warning: string;
}

export class DepotStatsDto {
  totalWorkers: number;
  activeWorkers: number;
  suspendedWorkers: number;
  inactiveWorkers: number;
  attendancesToday: number;
  attendancesThisWeek: number;
  attendancesThisMonth: number;
  averageWorkersPerDay: number;
  lastAttendanceAt?: Date | null;
}

export class DepotStatsResponseDto {
  success: boolean;
  data: {
    depot: {
      id: string;
      name: string;
    };
    stats: DepotStatsDto;
  };
}
