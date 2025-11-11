import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateEmbarcadorDto, UpdateEmbarcadorDto } from './dto';

@Injectable()
export class EmbarcadoresService {
  private readonly logger = new Logger(EmbarcadoresService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async create(createEmbarcadorDto: CreateEmbarcadorDto) {
    try {
      if (
        !createEmbarcadorDto.nombre ||
        createEmbarcadorDto.nombre.trim() === ''
      ) {
        throw new BadRequestException('El nombre del embarcador es requerido');
      }

      const embarcador = await this.prisma.embarcador.create({
        data: {
          nombre: createEmbarcadorDto.nombre.trim(),
          ci: createEmbarcadorDto.ci?.trim(),
          direccion: createEmbarcadorDto.direccion?.trim(),
          telefono: createEmbarcadorDto.telefono?.trim(),
          email: createEmbarcadorDto.email?.trim(),
          ciudad: createEmbarcadorDto.ciudad?.trim(),
          provincia: createEmbarcadorDto.provincia?.trim(),
          pais: createEmbarcadorDto.pais?.trim(),
          embarcadorCodigoPais:
            createEmbarcadorDto.embarcadorCodigoPais?.trim(),
          handling: createEmbarcadorDto.handling,
          estado: createEmbarcadorDto.estado ?? true,
        },
      });

      this.logger.log(
        `Embarcador creado: ${embarcador.id} - ${embarcador.nombre}`,
      );
      return embarcador;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al crear embarcador: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al crear embarcador');
    }
  }

  async findAll(skip?: number, take?: number) {
    try {
      const [embarcadores, total] = await Promise.all([
        this.prisma.embarcador.findMany({
          skip,
          take,
          orderBy: {
            nombre: 'asc',
          },
        }),
        this.prisma.embarcador.count(),
      ]);

      return {
        data: embarcadores,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener embarcadores: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener embarcadores');
    }
  }

  async findOne(id: number) {
    try {
      const embarcador = await this.prisma.embarcador.findUnique({
        where: { id },
      });

      if (!embarcador) {
        throw new NotFoundException(`Embarcador con ID ${id} no encontrado`);
      }

      return embarcador;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener embarcador: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener embarcador');
    }
  }

  async update(id: number, updateEmbarcadorDto: UpdateEmbarcadorDto) {
    try {
      const embarcador = await this.prisma.embarcador.findUnique({
        where: { id },
      });

      if (!embarcador) {
        throw new NotFoundException(`Embarcador con ID ${id} no encontrado`);
      }

      // Construir el objeto data dinámicamente
      const updateData: any = {};

      if (updateEmbarcadorDto.nombre !== undefined) {
        updateData.nombre = updateEmbarcadorDto.nombre.trim();
      }
      if (updateEmbarcadorDto.ci !== undefined) {
        updateData.ci = updateEmbarcadorDto.ci?.trim();
      }
      if (updateEmbarcadorDto.direccion !== undefined) {
        updateData.direccion = updateEmbarcadorDto.direccion?.trim();
      }
      if (updateEmbarcadorDto.telefono !== undefined) {
        updateData.telefono = updateEmbarcadorDto.telefono?.trim();
      }
      if (updateEmbarcadorDto.email !== undefined) {
        updateData.email = updateEmbarcadorDto.email?.trim();
      }
      if (updateEmbarcadorDto.ciudad !== undefined) {
        updateData.ciudad = updateEmbarcadorDto.ciudad?.trim();
      }
      if (updateEmbarcadorDto.provincia !== undefined) {
        updateData.provincia = updateEmbarcadorDto.provincia?.trim();
      }
      if (updateEmbarcadorDto.pais !== undefined) {
        updateData.pais = updateEmbarcadorDto.pais?.trim();
      }
      if (updateEmbarcadorDto.embarcadorCodigoPais !== undefined) {
        updateData.embarcadorCodigoPais =
          updateEmbarcadorDto.embarcadorCodigoPais?.trim();
      }
      if (updateEmbarcadorDto.handling !== undefined) {
        updateData.handling = updateEmbarcadorDto.handling;
      }
      if (updateEmbarcadorDto.estado !== undefined) {
        updateData.estado = updateEmbarcadorDto.estado;
      }

      const updatedEmbarcador = await this.prisma.embarcador.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(
        `Embarcador actualizado: ${id} - ${updatedEmbarcador.nombre}`,
      );
      return updatedEmbarcador;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar embarcador: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar embarcador');
    }
  }

  async remove(id: number) {
    try {
      const embarcador = await this.prisma.embarcador.findUnique({
        where: { id },
      });

      if (!embarcador) {
        throw new NotFoundException(`Embarcador con ID ${id} no encontrado`);
      }

      await this.prisma.embarcador.delete({
        where: { id },
      });

      this.logger.log(`Embarcador eliminado: ${id} - ${embarcador.nombre}`);
      return {
        message: `Embarcador ${embarcador.nombre} eliminado exitosamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar embarcador: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar embarcador');
    }
  }

  async findByName(nombre: string) {
    try {
      const embarcadores = await this.prisma.embarcador.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
      });

      return embarcadores;
    } catch (error) {
      this.logger.error(
        `Error al buscar embarcadores: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar embarcadores');
    }
  }
}
