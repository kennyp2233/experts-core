import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateCaeAduanaDto, UpdateCaeAduanaDto } from './dto';

@Injectable()
export class CaeAduanaService {
  private readonly logger = new Logger(CaeAduanaService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) { }

  async create(createCaeAduanaDto: CreateCaeAduanaDto) {
    try {
      const caeAduana = await this.prisma.caeAduana.create({
        data: {
          codigoAduana: createCaeAduanaDto.codigoAduana,
          nombre: createCaeAduanaDto.nombre.trim(),
        },
        include: {
          origenes: true,
        },
      });

      this.logger.log(
        `CAE Aduana creado: ${caeAduana.idCaeAduana} - ${caeAduana.nombre}`,
      );
      return caeAduana;
    } catch (error) {
      this.logger.error(
        `Error al crear CAE Aduana: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al crear CAE Aduana');
    }
  }

  async findAll(skip?: number, take?: number) {
    try {
      const [caeAduanas, total] = await Promise.all([
        this.prisma.caeAduana.findMany({
          skip,
          take,
          include: {
            origenes: true,
          },
          orderBy: {
            nombre: 'asc',
          },
        }),
        this.prisma.caeAduana.count(),
      ]);

      return {
        data: caeAduanas,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener CAE Aduanas: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener CAE Aduanas');
    }
  }

  async findOne(id: number) {
    try {
      const caeAduana = await this.prisma.caeAduana.findUnique({
        where: { idCaeAduana: id },
        include: {
          origenes: true,
        },
      });

      if (!caeAduana) {
        throw new NotFoundException(`CAE Aduana con ID ${id} no encontrado`);
      }

      return caeAduana;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener CAE Aduana: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener CAE Aduana');
    }
  }

  async update(id: number, updateCaeAduanaDto: UpdateCaeAduanaDto) {
    try {
      const caeAduana = await this.prisma.caeAduana.findUnique({
        where: { idCaeAduana: id },
      });

      if (!caeAduana) {
        throw new NotFoundException(`CAE Aduana con ID ${id} no encontrado`);
      }

      // Construir el objeto data dinámicamente
      const updateData: any = {};

      if (updateCaeAduanaDto.codigoAduana !== undefined) {
        updateData.codigoAduana = updateCaeAduanaDto.codigoAduana;
      }
      if (updateCaeAduanaDto.nombre !== undefined) {
        updateData.nombre = updateCaeAduanaDto.nombre.trim();
      }

      const updatedCaeAduana = await this.prisma.caeAduana.update({
        where: { idCaeAduana: id },
        data: updateData,
        include: {
          origenes: true,
        },
      });

      this.logger.log(
        `CAE Aduana actualizado: ${id} - ${updatedCaeAduana.nombre}`,
      );
      return updatedCaeAduana;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar CAE Aduana: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar CAE Aduana');
    }
  }

  async remove(id: number) {
    try {
      const caeAduana = await this.prisma.caeAduana.findUnique({
        where: { idCaeAduana: id },
      });

      if (!caeAduana) {
        throw new NotFoundException(`CAE Aduana con ID ${id} no encontrado`);
      }

      await this.prisma.caeAduana.delete({
        where: { idCaeAduana: id },
      });

      this.logger.log(`CAE Aduana eliminado: ${id} - ${caeAduana.nombre}`);
      return {
        message: `CAE Aduana ${caeAduana.nombre} eliminado exitosamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar CAE Aduana: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar CAE Aduana');
    }
  }

  async findByName(nombre: string) {
    try {
      const caeAduanas = await this.prisma.caeAduana.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        include: {
          origenes: true,
        },
      });

      return caeAduanas;
    } catch (error) {
      this.logger.error(
        `Error al buscar CAE Aduanas: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar CAE Aduanas');
    }
  }
}
