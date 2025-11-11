import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateChoferDto, UpdateChoferDto } from '../dto';

@Injectable()
export class ChoferesService {
  private readonly logger = new Logger(ChoferesService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async create(createChoferDto: CreateChoferDto) {
    try {
      if (!createChoferDto.nombre || createChoferDto.nombre.trim() === '') {
        throw new BadRequestException('El nombre del chofer es requerido');
      }

      if (!createChoferDto.ruc || createChoferDto.ruc.trim() === '') {
        throw new BadRequestException('El RUC del chofer es requerido');
      }

      // Verificar que el RUC no esté duplicado
      const existingChofer = await this.prisma.chofer.findFirst({
        where: { ruc: createChoferDto.ruc.trim() },
      });

      if (existingChofer) {
        throw new BadRequestException(
          `Ya existe un chofer con el RUC ${createChoferDto.ruc}`,
        );
      }

      const chofer = await this.prisma.chofer.create({
        data: {
          nombre: createChoferDto.nombre.trim(),
          ruc: createChoferDto.ruc.trim(),
          placasCamion: createChoferDto.placasCamion?.trim(),
          telefono: createChoferDto.telefono?.trim(),
          camion: createChoferDto.camion?.trim(),
          estado: createChoferDto.estado ?? true,
        },
        include: {
          fincasChoferes: true,
        },
      });

      this.logger.log(`Chofer creado: ${chofer.id} - ${chofer.nombre}`);

      return chofer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al crear chofer: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear chofer');
    }
  }

  async findAll(skip?: number, take?: number) {
    try {
      const [choferes, total] = await Promise.all([
        this.prisma.chofer.findMany({
          skip,
          take,
          include: {
            fincasChoferes: true,
          },
          orderBy: {
            nombre: 'asc',
          },
        }),
        this.prisma.chofer.count(),
      ]);

      return {
        data: choferes,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener choferes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener choferes');
    }
  }

  async findOne(id: number) {
    try {
      const chofer = await this.prisma.chofer.findUnique({
        where: { id },
        include: {
          fincasChoferes: true,
        },
      });

      if (!chofer) {
        throw new NotFoundException(`Chofer con ID ${id} no encontrado`);
      }

      return chofer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener chofer: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener chofer');
    }
  }

  async update(id: number, updateChoferDto: UpdateChoferDto) {
    try {
      const chofer = await this.prisma.chofer.findUnique({
        where: { id },
      });

      if (!chofer) {
        throw new NotFoundException(`Chofer con ID ${id} no encontrado`);
      }

      // Verificar RUC duplicado si se está actualizando
      if (updateChoferDto.ruc) {
        const existingChofer = await this.prisma.chofer.findFirst({
          where: { ruc: updateChoferDto.ruc.trim() },
        });

        if (existingChofer && existingChofer.id !== id) {
          throw new BadRequestException(
            `Ya existe un chofer con el RUC ${updateChoferDto.ruc}`,
          );
        }
      }

      const updateData: any = {};

      if (updateChoferDto.nombre !== undefined) {
        updateData.nombre = updateChoferDto.nombre.trim();
      }
      if (updateChoferDto.ruc !== undefined) {
        updateData.ruc = updateChoferDto.ruc.trim();
      }
      if (updateChoferDto.placasCamion !== undefined) {
        updateData.placasCamion = updateChoferDto.placasCamion?.trim();
      }
      if (updateChoferDto.telefono !== undefined) {
        updateData.telefono = updateChoferDto.telefono?.trim();
      }
      if (updateChoferDto.camion !== undefined) {
        updateData.camion = updateChoferDto.camion?.trim();
      }
      if (updateChoferDto.estado !== undefined) {
        updateData.estado = updateChoferDto.estado;
      }

      const updatedChofer = await this.prisma.chofer.update({
        where: { id },
        data: updateData,
        include: {
          fincasChoferes: true,
        },
      });

      this.logger.log(`Chofer actualizado: ${id} - ${updatedChofer.nombre}`);

      return updatedChofer;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar chofer: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar chofer');
    }
  }

  async remove(id: number) {
    try {
      const chofer = await this.prisma.chofer.findUnique({
        where: { id },
      });

      if (!chofer) {
        throw new NotFoundException(`Chofer con ID ${id} no encontrado`);
      }

      await this.prisma.chofer.delete({
        where: { id },
      });

      this.logger.log(`Chofer eliminado: ${id} - ${chofer.nombre}`);

      return {
        message: `Chofer ${chofer.nombre} eliminado exitosamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar chofer: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar chofer');
    }
  }

  async findByName(nombre: string) {
    try {
      const choferes = await this.prisma.chofer.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        include: {
          fincasChoferes: true,
        },
      });

      return choferes;
    } catch (error) {
      this.logger.error(
        `Error al buscar choferes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar choferes');
    }
  }

  async findByRuc(ruc: string) {
    try {
      const chofer = await this.prisma.chofer.findFirst({
        where: { ruc },
        include: {
          fincasChoferes: true,
        },
      });

      return chofer;
    } catch (error) {
      this.logger.error(
        `Error al buscar chofer por RUC: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar chofer por RUC');
    }
  }
}