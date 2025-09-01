import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { CreateDepotDto } from '../dto/create-depot.dto';
import { UpdateDepotDto } from '../dto/update-depot.dto';
import { QueryDepotsDto } from '../dto/query-depots.dto';
import { DepotResponseDto, PaginationDto } from '../dto/depot-response.dto';
import { plainToClass } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { GeographicUtils } from '../utils/geographic.utils';
import { DepotSecretService } from './depot-secret.service';

@Injectable()
export class DepotCrudService {
  private readonly logger = new Logger(DepotCrudService.name);

  constructor(
    private prisma: PrismaService,
    private depotSecretService: DepotSecretService
  ) {}

  async findAll(query: QueryDepotsDto): Promise<{
    items: DepotResponseDto[];
    pagination: PaginationDto;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      nearLat,
      nearLng,
      withinKm,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;

    // Construir condiciones de filtro
    const where: Prisma.DepotWhereInput = {
      AND: [
        // Filtro de búsqueda
        search ? {
          OR: [
            { name: { contains: search } },
            { address: { contains: search } }
          ]
        } : {},
        // Filtro por estado
        isActive !== undefined ? { isActive } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    try {
      // Obtener total de registros
      const total = await this.prisma.depot.count({ where });

      // Obtener depots con paginación
      let depots = await this.prisma.depot.findMany({
        where,
        include: {
          _count: {
            select: {
              workers: true,
              attendances: {
                where: {
                  createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                  }
                }
              }
            }
          },
          workers: {
            select: { status: true }
          }
        },
        orderBy: { [sortBy as keyof Prisma.DepotOrderByWithRelationInput]: sortOrder },
        skip,
        take: limit
      });

      // Aplicar filtro geográfico si se especifica
      if (nearLat !== undefined && nearLng !== undefined && withinKm !== undefined) {
        if (!GeographicUtils.validateCoordinates(nearLat, nearLng)) {
          throw new BadRequestException('Coordenadas geográficas inválidas');
        }

        depots = GeographicUtils.filterByProximity(
          depots,
          nearLat,
          nearLng,
          withinKm
        );
      }

      // Transformar datos
      const items = depots.map(depot => {
        const activeWorkersCount = depot.workers.filter(w => w.status === 'ACTIVE').length;
        
        return plainToClass(DepotResponseDto, {
          ...depot,
          workersCount: depot._count.workers,
          activeWorkersCount,
          attendancesToday: depot._count.attendances,
          distanceKm: (depot as any).distanceKm || undefined
        });
      });

      const pagination: PaginationDto = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };

      return { items, pagination };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al obtener depots: ${error.message}`);
      throw new BadRequestException('Error al obtener la lista de depots');
    }
  }

  async findOne(id: string): Promise<DepotResponseDto> {
    try {
      const depot = await this.prisma.depot.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              workers: true,
              attendances: {
                where: {
                  createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                  }
                }
              }
            }
          },
          workers: {
            select: { status: true }
          }
        }
      });

      if (!depot) {
        throw new NotFoundException(`Depot con ID ${id} no encontrado`);
      }

      const activeWorkersCount = depot.workers.filter(w => w.status === 'ACTIVE').length;

      return plainToClass(DepotResponseDto, {
        ...depot,
        workersCount: depot._count.workers,
        activeWorkersCount,
        attendancesToday: depot._count.attendances
      });

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener depot ${id}: ${error.message}`);
      throw new BadRequestException('Error al obtener el depot');
    }
  }

  async create(createDepotDto: CreateDepotDto): Promise<DepotResponseDto> {
    try {
      // Validar coordenadas
      if (!GeographicUtils.validateCoordinates(createDepotDto.latitude, createDepotDto.longitude)) {
        throw new BadRequestException('Coordenadas geográficas inválidas');
      }

      // Verificar unicidad del nombre
      const existingDepot = await this.prisma.depot.findFirst({
        where: { name: createDepotDto.name }
      });

      if (existingDepot) {
        throw new ConflictException(`Ya existe un depot con el nombre: ${createDepotDto.name}`);
      }

      // Generar secreto único
      const secret = await this.depotSecretService.generateInitialSecret();

      const depot = await this.prisma.depot.create({
        data: {
          ...createDepotDto,
          secret,
          radius: createDepotDto.radius || 100
        }
      });

      this.logger.log(`Depot creado exitosamente: ${depot.name}`);

      return plainToClass(DepotResponseDto, {
        ...depot,
        workersCount: 0,
        activeWorkersCount: 0,
        attendancesToday: 0
      });

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error al crear depot: ${error.message}`);
      throw new BadRequestException('Error al crear el depot');
    }
  }

  async update(id: string, updateDepotDto: UpdateDepotDto): Promise<DepotResponseDto> {
    try {
      // Verificar que el depot existe
      const existingDepot = await this.prisma.depot.findUnique({
        where: { id }
      });

      if (!existingDepot) {
        throw new NotFoundException(`Depot con ID ${id} no encontrado`);
      }

      // Validar coordenadas si se están actualizando
      if (updateDepotDto.latitude !== undefined && updateDepotDto.longitude !== undefined) {
        if (!GeographicUtils.validateCoordinates(updateDepotDto.latitude, updateDepotDto.longitude)) {
          throw new BadRequestException('Coordenadas geográficas inválidas');
        }
      }

      // Verificar unicidad del nombre si se está actualizando
      if (updateDepotDto.name && updateDepotDto.name !== existingDepot.name) {
        const existingWithName = await this.prisma.depot.findFirst({
          where: { name: updateDepotDto.name }
        });

        if (existingWithName) {
          throw new ConflictException(`Ya existe un depot con el nombre: ${updateDepotDto.name}`);
        }
      }

      const depot = await this.prisma.depot.update({
        where: { id },
        data: updateDepotDto,
        include: {
          _count: {
            select: {
              workers: true,
              attendances: {
                where: {
                  createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                  }
                }
              }
            }
          },
          workers: {
            select: { status: true }
          }
        }
      });

      this.logger.log(`Depot actualizado exitosamente: ${depot.name}`);

      const activeWorkersCount = depot.workers.filter(w => w.status === 'ACTIVE').length;

      return plainToClass(DepotResponseDto, {
        ...depot,
        workersCount: depot._count.workers,
        activeWorkersCount,
        attendancesToday: depot._count.attendances
      });

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al actualizar depot ${id}: ${error.message}`);
      throw new BadRequestException('Error al actualizar el depot');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const existingDepot = await this.prisma.depot.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              workers: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        }
      });

      if (!existingDepot) {
        throw new NotFoundException(`Depot con ID ${id} no encontrado`);
      }

      // No permitir eliminar depot con workers activos
      if (existingDepot._count.workers > 0) {
        throw new ConflictException(
          `No se puede eliminar el depot porque tiene ${existingDepot._count.workers} workers activos asignados`
        );
      }

      // Soft delete: cambiar isActive a false
      await this.prisma.depot.update({
        where: { id },
        data: { isActive: false }
      });

      this.logger.log(`Depot desactivado exitosamente: ${existingDepot.name}`);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error al eliminar depot ${id}: ${error.message}`);
      throw new BadRequestException('Error al eliminar el depot');
    }
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number = 10
  ): Promise<DepotResponseDto[]> {
    if (!GeographicUtils.validateCoordinates(latitude, longitude)) {
      throw new BadRequestException('Coordenadas geográficas inválidas');
    }

    const allDepots = await this.prisma.depot.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { workers: true }
        }
      },
      take: 100 // Limitar la consulta inicial
    });

    const nearbyDepots = GeographicUtils.filterByProximity(
      allDepots,
      latitude,
      longitude,
      radiusKm
    ).slice(0, limit);

    return nearbyDepots.map(depot =>
      plainToClass(DepotResponseDto, {
        ...depot,
        workersCount: depot._count.workers,
        distanceKm: depot.distanceKm
      })
    );
  }
}
