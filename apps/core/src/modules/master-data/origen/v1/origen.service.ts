import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateOrigenDto, UpdateOrigenDto } from './dto';

@Injectable()
export class OrigenService {
  private readonly logger = new Logger(OrigenService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async create(createOrigenDto: CreateOrigenDto) {
    try {
      // Verificar que el país existe si se proporciona
      if (createOrigenDto.idPais) {
        const pais = await this.prisma.pais.findUnique({
          where: { idPais: createOrigenDto.idPais },
        });

        if (!pais) {
          throw new BadRequestException(
            `No existe un país con ID ${createOrigenDto.idPais}`,
          );
        }
      }

      // Verificar que la CAE Aduana existe si se proporciona
      if (createOrigenDto.idCaeAduana) {
        const caeAduana = await this.prisma.caeAduana.findUnique({
          where: { idCaeAduana: createOrigenDto.idCaeAduana },
        });

        if (!caeAduana) {
          throw new BadRequestException(
            `No existe una CAE Aduana con ID ${createOrigenDto.idCaeAduana}`,
          );
        }
      }

      const origen = await this.prisma.origen.create({
        data: {
          nombre: createOrigenDto.nombre?.trim(),
          aeropuerto: createOrigenDto.aeropuerto?.trim(),
          idPais: createOrigenDto.idPais,
          idCaeAduana: createOrigenDto.idCaeAduana,
        },
        include: {
          pais: true,
          caeAduana: true,
        },
      });

      this.logger.log(`Origen creado: ${origen.id} - ${origen.nombre}`);
      return origen;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al crear origen: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear origen');
    }
  }

  async findAll(skip?: number, take?: number, sortField?: string, sortOrder?: string) {
    try {
      // Configurar ordenamiento dinámico
      let orderBy: any = { nombre: 'asc' }; // Default order

      if (sortField && sortOrder) {
        // Validar que sortOrder sea válido
        const validSortOrder = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

        // Validar que sortField sea un campo válido
        const validFields = ['id', 'nombre', 'aeropuerto'];
        if (validFields.includes(sortField)) {
          orderBy = { [sortField]: validSortOrder };
        }
      }

      const [origenes, total] = await Promise.all([
        this.prisma.origen.findMany({
          skip,
          take,
          include: {
            pais: true,
            caeAduana: true,
          },
          orderBy,
        }),
        this.prisma.origen.count(),
      ]);

      return {
        data: origenes,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener origenes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener origenes');
    }
  }

  async findOne(id: number) {
    try {
      const origen = await this.prisma.origen.findUnique({
        where: { id },
        include: {
          pais: true,
          caeAduana: true,
        },
      });

      if (!origen) {
        throw new NotFoundException(`Origen con ID ${id} no encontrado`);
      }

      return origen;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener origen: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener origen');
    }
  }

  async update(id: number, updateOrigenDto: UpdateOrigenDto) {
    try {
      const origen = await this.prisma.origen.findUnique({
        where: { id },
      });

      if (!origen) {
        throw new NotFoundException(`Origen con ID ${id} no encontrado`);
      }

      // Verificar que el país existe si se proporciona
      if (updateOrigenDto.idPais !== undefined) {
        if (updateOrigenDto.idPais) {
          const pais = await this.prisma.pais.findUnique({
            where: { idPais: updateOrigenDto.idPais },
          });

          if (!pais) {
            throw new BadRequestException(
              `No existe un país con ID ${updateOrigenDto.idPais}`,
            );
          }
        }
      }

      // Verificar que la CAE Aduana existe si se proporciona
      if (updateOrigenDto.idCaeAduana !== undefined) {
        if (updateOrigenDto.idCaeAduana) {
          const caeAduana = await this.prisma.caeAduana.findUnique({
            where: { idCaeAduana: updateOrigenDto.idCaeAduana },
          });

          if (!caeAduana) {
            throw new BadRequestException(
              `No existe una CAE Aduana con ID ${updateOrigenDto.idCaeAduana}`,
            );
          }
        }
      }

      // Construir el objeto data dinámicamente
      const updateData: any = {};

      if (updateOrigenDto.nombre !== undefined) {
        updateData.nombre = updateOrigenDto.nombre?.trim();
      }
      if (updateOrigenDto.aeropuerto !== undefined) {
        updateData.aeropuerto = updateOrigenDto.aeropuerto?.trim();
      }
      if (updateOrigenDto.idPais !== undefined) {
        updateData.idPais = updateOrigenDto.idPais;
      }
      if (updateOrigenDto.idCaeAduana !== undefined) {
        updateData.idCaeAduana = updateOrigenDto.idCaeAduana;
      }

      const updatedOrigen = await this.prisma.origen.update({
        where: { id },
        data: updateData,
        include: {
          pais: true,
          caeAduana: true,
        },
      });

      this.logger.log(`Origen actualizado: ${id} - ${updatedOrigen.nombre}`);
      return updatedOrigen;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar origen: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar origen');
    }
  }

  async remove(id: number) {
    try {
      const origen = await this.prisma.origen.findUnique({
        where: { id },
      });

      if (!origen) {
        throw new NotFoundException(`Origen con ID ${id} no encontrado`);
      }

      await this.prisma.origen.delete({
        where: { id },
      });

      this.logger.log(`Origen eliminado: ${id} - ${origen.nombre}`);
      return { message: `Origen ${origen.nombre} eliminado exitosamente` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar origen: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar origen');
    }
  }

  async findByName(nombre: string) {
    try {
      const origenes = await this.prisma.origen.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        include: {
          pais: true,
          caeAduana: true,
        },
      });

      return origenes;
    } catch (error) {
      this.logger.error(
        `Error al buscar origenes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar origenes');
    }
  }
}
