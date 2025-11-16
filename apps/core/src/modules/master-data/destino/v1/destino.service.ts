import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateDestinoDto, UpdateDestinoDto } from './dto';

@Injectable()
export class DestinoService {
  private readonly logger = new Logger(DestinoService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async create(createDestinoDto: CreateDestinoDto) {
    try {
      // Verificar que el país existe
      const pais = await this.prisma.pais.findUnique({
        where: { idPais: createDestinoDto.idPais },
      });

      if (!pais) {
        throw new BadRequestException(
          `No existe un país con ID ${createDestinoDto.idPais}`,
        );
      }

      const destino = await this.prisma.destino.create({
        data: {
          nombre: createDestinoDto.nombre?.trim(),
          aeropuerto: createDestinoDto.aeropuerto?.trim(),
          idPais: createDestinoDto.idPais,
          sesaId: createDestinoDto.sesaId?.trim(),
          leyendaFito: createDestinoDto.leyendaFito?.trim(),
          cobroFitos: createDestinoDto.cobroFitos ?? false,
        },
        include: {
          pais: true,
        },
      });

      this.logger.log(`Destino creado: ${destino.id} - ${destino.nombre}`);
      return destino;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al crear destino: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al crear destino');
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
        const validFields = ['id', 'nombre', 'aeropuerto', 'sesaId', 'cobroFitos'];
        if (validFields.includes(sortField)) {
          orderBy = { [sortField]: validSortOrder };
        }
      }

      const [destinos, total] = await Promise.all([
        this.prisma.destino.findMany({
          skip,
          take,
          include: {
            pais: true,
          },
          orderBy,
        }),
        this.prisma.destino.count(),
      ]);

      return {
        data: destinos,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener destinos: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener destinos');
    }
  }

  async findOne(id: number) {
    try {
      const destino = await this.prisma.destino.findUnique({
        where: { id },
        include: {
          pais: true,
        },
      });

      if (!destino) {
        throw new NotFoundException(`Destino con ID ${id} no encontrado`);
      }

      return destino;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener destino: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener destino');
    }
  }

  async update(id: number, updateDestinoDto: UpdateDestinoDto) {
    try {
      const destino = await this.prisma.destino.findUnique({
        where: { id },
      });

      if (!destino) {
        throw new NotFoundException(`Destino con ID ${id} no encontrado`);
      }

      // Verificar que el país existe si se proporciona
      if (updateDestinoDto.idPais !== undefined) {
        const pais = await this.prisma.pais.findUnique({
          where: { idPais: updateDestinoDto.idPais },
        });

        if (!pais) {
          throw new BadRequestException(
            `No existe un país con ID ${updateDestinoDto.idPais}`,
          );
        }
      }

      // Construir el objeto data dinámicamente
      const updateData: any = {};

      if (updateDestinoDto.tag !== undefined) {
        updateData.tag = updateDestinoDto.tag?.trim();
      }
      if (updateDestinoDto.nombre !== undefined) {
        updateData.nombre = updateDestinoDto.nombre?.trim();
      }
      if (updateDestinoDto.aeropuerto !== undefined) {
        updateData.aeropuerto = updateDestinoDto.aeropuerto?.trim();
      }
      if (updateDestinoDto.idPais !== undefined) {
        updateData.idPais = updateDestinoDto.idPais;
      }
      if (updateDestinoDto.sesaId !== undefined) {
        updateData.sesaId = updateDestinoDto.sesaId?.trim();
      }
      if (updateDestinoDto.leyendaFito !== undefined) {
        updateData.leyendaFito = updateDestinoDto.leyendaFito?.trim();
      }
      if (updateDestinoDto.cobroFitos !== undefined) {
        updateData.cobroFitos = updateDestinoDto.cobroFitos;
      }

      const updatedDestino = await this.prisma.destino.update({
        where: { id },
        data: updateData,
        include: {
          pais: true,
        },
      });

      this.logger.log(`Destino actualizado: ${id} - ${updatedDestino.nombre}`);
      return updatedDestino;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar destino: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar destino');
    }
  }

  async remove(id: number) {
    try {
      const destino = await this.prisma.destino.findUnique({
        where: { id },
      });

      if (!destino) {
        throw new NotFoundException(`Destino con ID ${id} no encontrado`);
      }

      await this.prisma.destino.delete({
        where: { id },
      });

      this.logger.log(`Destino eliminado: ${id} - ${destino.nombre}`);
      return { message: `Destino ${destino.nombre} eliminado exitosamente` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar destino: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar destino');
    }
  }

  async findByName(nombre: string) {
    try {
      const destinos = await this.prisma.destino.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        include: {
          pais: true,
        },
      });

      return destinos;
    } catch (error) {
      this.logger.error(
        `Error al buscar destinos: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar destinos');
    }
  }
}
