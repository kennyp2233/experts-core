import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateMedidaDto, UpdateMedidaDto } from '../dto';

@Injectable()
export class MedidasService {
  private readonly logger = new Logger(MedidasService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) { }

  async create(createMedidaDto: CreateMedidaDto) {
    try {
      if (!createMedidaDto.nombre || createMedidaDto.nombre.trim() === '') {
        throw new BadRequestException('El nombre de la medida es requerido');
      }

      // Verificar que el nombre no esté duplicado
      const existingMedida = await this.prisma.medida.findFirst({
        where: { nombre: createMedidaDto.nombre.trim() },
      });

      if (existingMedida) {
        throw new BadRequestException(
          `Ya existe una medida con el nombre ${createMedidaDto.nombre}`,
        );
      }

      const medida = await this.prisma.medida.create({
        data: {
          nombre: createMedidaDto.nombre.trim(),
          estado: createMedidaDto.estado ?? true,
        },
        include: {
          productos: true,
        },
      });

      this.logger.log(`Medida creada: ${medida.id} - ${medida.nombre}`);

      return medida;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al crear medida: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear medida');
    }
  }

  async findAll(skip?: number, take?: number) {
    try {
      const [medidas, total] = await Promise.all([
        this.prisma.medida.findMany({
          skip,
          take,
          include: {
            productos: true,
          },
          orderBy: {
            nombre: 'asc',
          },
        }),
        this.prisma.medida.count(),
      ]);

      return {
        data: medidas,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener medidas: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener medidas');
    }
  }

  async findOne(id: number) {
    try {
      const medida = await this.prisma.medida.findUnique({
        where: { id },
        include: {
          productos: true,
        },
      });

      if (!medida) {
        throw new NotFoundException(`Medida con ID ${id} no encontrada`);
      }

      return medida;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener medida: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener medida');
    }
  }

  async update(id: number, updateMedidaDto: UpdateMedidaDto) {
    try {
      const medida = await this.prisma.medida.findUnique({
        where: { id },
      });

      if (!medida) {
        throw new NotFoundException(`Medida con ID ${id} no encontrada`);
      }

      // Verificar nombre duplicado si se está actualizando
      if (updateMedidaDto.nombre) {
        const existingMedida = await this.prisma.medida.findFirst({
          where: { nombre: updateMedidaDto.nombre.trim() },
        });

        if (existingMedida && existingMedida.id !== id) {
          throw new BadRequestException(
            `Ya existe una medida con el nombre ${updateMedidaDto.nombre}`,
          );
        }
      }

      const updateData: any = {};

      if (updateMedidaDto.nombre !== undefined) {
        updateData.nombre = updateMedidaDto.nombre.trim();
      }
      if (updateMedidaDto.estado !== undefined) {
        updateData.estado = updateMedidaDto.estado;
      }

      const updatedMedida = await this.prisma.medida.update({
        where: { id },
        data: updateData,
        include: {
          productos: true,
        },
      });

      this.logger.log(`Medida actualizada: ${id} - ${updatedMedida.nombre}`);

      return updatedMedida;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar medida: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar medida');
    }
  }

  async remove(id: number) {
    try {
      const medida = await this.prisma.medida.findUnique({
        where: { id },
      });

      if (!medida) {
        throw new NotFoundException(`Medida con ID ${id} no encontrada`);
      }

      await this.prisma.medida.delete({
        where: { id },
      });

      this.logger.log(`Medida eliminada: ${id} - ${medida.nombre}`);

      return {
        message: `Medida ${medida.nombre} eliminada exitosamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar medida: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar medida');
    }
  }

  async findByName(nombre: string) {
    try {
      const medidas = await this.prisma.medida.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        include: {
          productos: true,
        },
      });

      return medidas;
    } catch (error) {
      this.logger.error(
        `Error al buscar medidas: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar medidas');
    }
  }

  async findSimple() {
    try {
      const medidas = await this.prisma.medida.findMany({
        select: {
          id: true,
          nombre: true,
        },
        where: {
          estado: true,
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      return medidas;
    } catch (error) {
      this.logger.error(
        `Error al obtener medidas simples: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener medidas simples');
    }
  }
}