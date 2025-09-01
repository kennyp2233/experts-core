import { Injectable } from '@nestjs/common';
import { CreateDepotDto } from './dto/create-depot.dto';
import { UpdateDepotDto } from './dto/update-depot.dto';
import { QueryDepotsDto } from './dto/query-depots.dto';
import { 
  DepotResponseDto, 
  DepotsListResponseDto,
  DepotStatsResponseDto 
} from './dto/depot-response.dto';
import { DepotCrudService } from './services/depot-crud.service';
import { DepotStatsService } from './services/depot-stats.service';
import { DepotSecretService } from './services/depot-secret.service';

@Injectable()
export class DepotsService {
  constructor(
    private depotCrudService: DepotCrudService,
    private depotStatsService: DepotStatsService,
    private depotSecretService: DepotSecretService
  ) {}

  async findAll(query: QueryDepotsDto): Promise<DepotsListResponseDto> {
    const { items, pagination } = await this.depotCrudService.findAll(query);
    
    return {
      success: true,
      data: {
        items,
        pagination
      }
    };
  }

  async findOne(id: string): Promise<DepotResponseDto> {
    return this.depotCrudService.findOne(id);
  }

  async create(createDepotDto: CreateDepotDto): Promise<DepotResponseDto> {
    return this.depotCrudService.create(createDepotDto);
  }

  async update(id: string, updateDepotDto: UpdateDepotDto): Promise<DepotResponseDto> {
    return this.depotCrudService.update(id, updateDepotDto);
  }

  async remove(id: string): Promise<void> {
    return this.depotCrudService.remove(id);
  }

  async regenerateSecret(depotId: string): Promise<{
    id: string;
    secretUpdatedAt: Date;
  }> {
    return this.depotSecretService.regenerateSecret(depotId);
  }

  async getDepotStats(depotId: string): Promise<DepotStatsResponseDto> {
    const depot = await this.depotCrudService.findOne(depotId);
    const stats = await this.depotStatsService.getDepotStats(depotId);

    return {
      success: true,
      data: {
        depot: {
          id: depot.id,
          name: depot.name
        },
        stats
      }
    };
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit?: number
  ): Promise<DepotResponseDto[]> {
    return this.depotCrudService.findNearby(latitude, longitude, radiusKm, limit);
  }

  async findWorkersByDepot(depotId: string, query: any): Promise<any> {
    // Esta funcionalidad se puede implementar integrando con WorkersService
    // Por ahora retornamos la estructura básica
    const depot = await this.depotCrudService.findOne(depotId);
    
    return {
      success: true,
      data: {
        depot: {
          id: depot.id,
          name: depot.name
        },
        workers: [] // Se implementará con WorkersService
      }
    };
  }
}
