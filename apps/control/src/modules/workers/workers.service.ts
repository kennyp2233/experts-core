import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto, UpdateWorkerStatusDto } from './dto/update-worker.dto';
import { QueryWorkersDto } from './dto/query-workers.dto';
import {
  WorkerResponseDto,
  PaginationDto,
  WorkersListResponseDto
} from './dto/worker-response.dto';
import { plainToClass } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { EmployeeIdGenerator, EmployeeIdFormat } from './utils/employee-id-generator.util';

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(private prisma: PrismaService) { }

  async findAll(query: QueryWorkersDto): Promise<WorkersListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      depotId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;

    // Construir condiciones de filtro
    const where: Prisma.WorkerWhereInput = {
      AND: [
        // Filtro de búsqueda
        search ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { employeeId: { contains: search } }
          ]
        } : {},
        // Filtro por status
        status ? { status } : {},
        // Filtro por depot
        depotId ? { depotId } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    try {
      // Obtener total de registros
      const total = await this.prisma.worker.count({ where });

      // Obtener workers con paginación
      const workers = await this.prisma.worker.findMany({
        where,
        include: {
          depot: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          _count: {
            select: {
              attendances: true
            }
          }
        },
        orderBy: { [sortBy as keyof Prisma.WorkerOrderByWithRelationInput]: sortOrder },
        skip,
        take: limit
      });

      // Transformar datos
      const items = workers.map(worker => {
        const transformed = plainToClass(WorkerResponseDto, {
          ...worker,
          attendancesCount: worker._count.attendances
        });
        return transformed;
      });

      const pagination: PaginationDto = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };

      return {
        success: true,
        data: {
          items,
          pagination
        }
      };

    } catch (error) {
      this.logger.error(`Error al obtener workers: ${error.message}`);
      throw new BadRequestException('Error al obtener la lista de workers');
    }
  }

  async findOne(id: string): Promise<WorkerResponseDto> {
    try {
      const worker = await this.prisma.worker.findUnique({
        where: { id },
        include: {
          depot: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          _count: {
            select: {
              attendances: true
            }
          }
        }
      });

      if (!worker) {
        throw new NotFoundException(`Worker con ID ${id} no encontrado`);
      }

      return plainToClass(WorkerResponseDto, {
        ...worker,
        attendancesCount: worker._count.attendances
      });

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener worker ${id}: ${error.message}`);
      throw new BadRequestException('Error al obtener el worker');
    }
  }

  async create(createWorkerDto: CreateWorkerDto): Promise<WorkerResponseDto> {
    try {
      // Verificar que el depot existe
      const depot = await this.prisma.depot.findUnique({
        where: { id: createWorkerDto.depotId }
      });

      if (!depot) {
        throw new NotFoundException(`Depot con ID ${createWorkerDto.depotId} no encontrado`);
      }

      // NUEVO: Generar employeeId automáticamente si no viene en el DTO
      let employeeId = createWorkerDto.employeeId;

      if (!employeeId) {
        this.logger.log('Generando employeeId automáticamente...');

        // Generar con formato SEQUENTIAL (EMP-00001, EMP-00002, ...)
        // Puedes cambiar el formato según necesites:
        employeeId = await EmployeeIdGenerator.generateUnique(this.prisma, {
          format: EmployeeIdFormat.SEQUENTIAL,
          prefix: 'EMP',
          digits: 5,
        });

        this.logger.log(`EmployeeId generado: ${employeeId}`);
      } else {
        // Si viene employeeId, verificar unicidad
        const existingWorkerById = await this.prisma.worker.findUnique({
          where: { employeeId }
        });

        if (existingWorkerById) {
          throw new ConflictException(`Ya existe un worker con employeeId: ${employeeId}`);
        }
      }

      // Verificar unicidad de email si se proporciona
      if (createWorkerDto.email) {
        const existingWorkerByEmail = await this.prisma.worker.findUnique({
          where: { email: createWorkerDto.email }
        });

        if (existingWorkerByEmail) {
          throw new ConflictException(`Ya existe un worker con email: ${createWorkerDto.email}`);
        }
      }

      const worker = await this.prisma.worker.create({
        data: {
          ...createWorkerDto,
          employeeId, // Usar el employeeId generado o proporcionado
          status: createWorkerDto.status || 'ACTIVE'
        },
        include: {
          depot: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      });

      this.logger.log(`Worker creado exitosamente: ${worker.employeeId}`);

      return plainToClass(WorkerResponseDto, {
        ...worker,
        attendancesCount: 0
      });

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error al crear worker: ${error.message}`);
      throw new BadRequestException('Error al crear el worker');
    }
  }

  async update(id: string, updateWorkerDto: UpdateWorkerDto): Promise<WorkerResponseDto> {
    try {
      // Verificar que el worker existe
      const existingWorker = await this.prisma.worker.findUnique({
        where: { id }
      });

      if (!existingWorker) {
        throw new NotFoundException(`Worker con ID ${id} no encontrado`);
      }

      // Verificar que el depot existe si se está actualizando
      if (updateWorkerDto.depotId) {
        const depot = await this.prisma.depot.findUnique({
          where: { id: updateWorkerDto.depotId }
        });

        if (!depot) {
          throw new NotFoundException(`Depot con ID ${updateWorkerDto.depotId} no encontrado`);
        }
      }

      // Verificar unicidad de employeeId si se está actualizando
      if (updateWorkerDto.employeeId && updateWorkerDto.employeeId !== existingWorker.employeeId) {
        const existingWorkerById = await this.prisma.worker.findUnique({
          where: { employeeId: updateWorkerDto.employeeId }
        });

        if (existingWorkerById) {
          throw new ConflictException(`Ya existe un worker con employeeId: ${updateWorkerDto.employeeId}`);
        }
      }

      // Verificar unicidad de email si se está actualizando
      if (updateWorkerDto.email && updateWorkerDto.email !== existingWorker.email) {
        const existingWorkerByEmail = await this.prisma.worker.findUnique({
          where: { email: updateWorkerDto.email }
        });

        if (existingWorkerByEmail) {
          throw new ConflictException(`Ya existe un worker con email: ${updateWorkerDto.email}`);
        }
      }

      const worker = await this.prisma.worker.update({
        where: { id },
        data: updateWorkerDto,
        include: {
          depot: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          _count: {
            select: {
              attendances: true
            }
          }
        }
      });

      this.logger.log(`Worker actualizado exitosamente: ${worker.employeeId}`);

      return plainToClass(WorkerResponseDto, {
        ...worker,
        attendancesCount: worker._count.attendances
      });

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error al actualizar worker ${id}: ${error.message}`);
      throw new BadRequestException('Error al actualizar el worker');
    }
  }

  async updateStatus(id: string, updateStatusDto: UpdateWorkerStatusDto): Promise<WorkerResponseDto> {
    try {
      const existingWorker = await this.prisma.worker.findUnique({
        where: { id }
      });

      if (!existingWorker) {
        throw new NotFoundException(`Worker con ID ${id} no encontrado`);
      }

      const worker = await this.prisma.worker.update({
        where: { id },
        data: { status: updateStatusDto.status },
        include: {
          depot: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          _count: {
            select: {
              attendances: true
            }
          }
        }
      });

      this.logger.log(`Status de worker actualizado: ${worker.employeeId} -> ${updateStatusDto.status}`);

      return plainToClass(WorkerResponseDto, {
        ...worker,
        attendancesCount: worker._count.attendances
      });

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al actualizar status del worker ${id}: ${error.message}`);
      throw new BadRequestException('Error al actualizar el status del worker');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const existingWorker = await this.prisma.worker.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              attendances: true
            }
          }
        }
      });

      if (!existingWorker) {
        throw new NotFoundException(`Worker con ID ${id} no encontrado`);
      }

      // No permitir eliminar worker con asistencias registradas
      if (existingWorker._count.attendances > 0) {
        throw new ConflictException(
          `No se puede eliminar el worker porque tiene ${existingWorker._count.attendances} asistencias registradas. Considere desactivarlo en su lugar.`
        );
      }

      // Soft delete: cambiar status a INACTIVE en lugar de eliminar
      await this.prisma.worker.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });

      this.logger.log(`Worker desactivado exitosamente: ${existingWorker.employeeId}`);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error al eliminar worker ${id}: ${error.message}`);
      throw new BadRequestException('Error al eliminar el worker');
    }
  }

  // Método para obtener el estado del turno de un trabajador
  async getShiftStatus(workerId: string): Promise<{
    isOnShift: boolean;
    currentShiftId?: string;
    currentAttendanceId?: string;
    lastAction?: 'ENTRY' | 'EXIT';
    lastActionTimestamp?: Date;
  }> {
    try {
      console.log('[WorkersService - Backend] 🔍 Obteniendo estado del turno para worker:', workerId);

      // Verificar que el worker existe
      const worker = await this.prisma.worker.findUnique({
        where: { id: workerId }
      });

      if (!worker) {
        throw new NotFoundException(`Worker con ID ${workerId} no encontrado`);
      }

      // FIX CRÍTICO: Buscar registros de asistencia activos del trabajador ordenados por timestamp (no createdAt)
      const recentAttendances = await this.prisma.attendanceRecord.findMany({
        where: {
          attendance: {
            workerId: workerId
          }
        },
        orderBy: {
          timestamp: 'desc' // FIX: Usar timestamp del record, no createdAt
        },
        take: 10, // Tomar más registros para análisis
        include: {
          attendance: {
            select: {
              id: true,
              workerId: true
            }
          }
        }
      });

      console.log('[WorkersService - Backend] 📊 Registros encontrados:', {
        count: recentAttendances.length,
        records: recentAttendances.map(r => ({
          id: r.id,
          type: r.type,
          timestamp: r.timestamp,
          attendanceId: r.attendance.id
        }))
      });

      if (!recentAttendances.length) {
        console.log('[WorkersService - Backend] ❌ No hay registros - Worker está OFF_SHIFT');
        return {
          isOnShift: false
        };
      }

      // FIX CRÍTICO: Analizar la secuencia de ENTRY/EXIT para determinar estado actual
      const lastRecord = recentAttendances[0];
      const isCurrentlyOnShift = lastRecord.type === 'ENTRY';

      console.log('[WorkersService - Backend] 🎯 Último registro:', {
        id: lastRecord.id,
        type: lastRecord.type,
        timestamp: lastRecord.timestamp,
        attendanceId: lastRecord.attendance.id,
        isCurrentlyOnShift
      });

      const result = {
        isOnShift: isCurrentlyOnShift,
        currentShiftId: isCurrentlyOnShift ? lastRecord.attendance.id : undefined,
        currentAttendanceId: isCurrentlyOnShift ? lastRecord.attendance.id : undefined,
        lastAction: lastRecord.type as 'ENTRY' | 'EXIT',
        lastActionTimestamp: lastRecord.timestamp
      };

      console.log('[WorkersService - Backend] ✅ Estado calculado:', result);
      return result;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('[WorkersService - Backend] ❌ Error obteniendo estado del turno:', error);
      this.logger.error(`Error obteniendo estado del turno para worker ${workerId}: ${error.message}`);
      throw new BadRequestException('Error al obtener el estado del turno');
    }
  }

  async findByDepot(depotId: string, query: QueryWorkersDto): Promise<WorkersListResponseDto> {
    // Verificar que el depot existe
    const depot = await this.prisma.depot.findUnique({
      where: { id: depotId }
    });

    if (!depot) {
      throw new NotFoundException(`Depot con ID ${depotId} no encontrado`);
    }

    // Usar findAll con filtro de depot
    return this.findAll({ ...query, depotId });
  }
}
