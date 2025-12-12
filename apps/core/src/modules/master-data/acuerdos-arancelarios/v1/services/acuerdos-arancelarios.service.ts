import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateAcuerdoArancelarioDto, UpdateAcuerdoArancelarioDto } from '../dto';

@Injectable()
export class AcuerdosArancelariosService {
  private readonly logger = new Logger(AcuerdosArancelariosService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) { }

  async create(createAcuerdoDto: CreateAcuerdoArancelarioDto) {
    try {
      if (!createAcuerdoDto.nombre || createAcuerdoDto.nombre.trim() === '') {
        throw new BadRequestException('El nombre del acuerdo arancelario es requerido');
      }

      // Verificar que el nombre no esté duplicado
      const existingAcuerdo = await this.prisma.acuerdoArancelario.findFirst({
        where: { nombre: createAcuerdoDto.nombre.trim() },
      });

      if (existingAcuerdo) {
        throw new BadRequestException(
          `Ya existe un acuerdo arancelario con el nombre ${createAcuerdoDto.nombre}`,
        );
      }

      const acuerdo = await this.prisma.acuerdoArancelario.create({
        data: {
          nombre: createAcuerdoDto.nombre.trim(),
        },
      });

      this.logger.log(`Acuerdo arancelario creado: ${acuerdo.idAcuerdo} - ${acuerdo.nombre}`);

      return acuerdo;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al crear acuerdo arancelario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear acuerdo arancelario');
    }
  }

  async findAll(skip?: number, take?: number, search?: string) {
    try {
      const where = search
        ? {
          nombre: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
        : {};

      const [acuerdos, total] = await Promise.all([
        this.prisma.acuerdoArancelario.findMany({
          where,
          skip,
          take,
          orderBy: {
            nombre: 'asc',
          },
        }),
        this.prisma.acuerdoArancelario.count({ where }),
      ]);

      return {
        data: acuerdos,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(`Error al obtener acuerdos arancelarios: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener acuerdos arancelarios');
    }
  }

  async findOne(id: number) {
    try {
      const acuerdo = await this.prisma.acuerdoArancelario.findUnique({
        where: { idAcuerdo: id },
      });

      if (!acuerdo) {
        throw new NotFoundException(`Acuerdo arancelario con ID ${id} no encontrado`);
      }

      return acuerdo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener acuerdo arancelario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener acuerdo arancelario');
    }
  }

  async update(id: number, updateAcuerdoDto: UpdateAcuerdoArancelarioDto) {
    try {
      const acuerdo = await this.prisma.acuerdoArancelario.findUnique({
        where: { idAcuerdo: id },
      });

      if (!acuerdo) {
        throw new NotFoundException(`Acuerdo arancelario con ID ${id} no encontrado`);
      }

      // Verificar nombre duplicado si se está actualizando
      if (updateAcuerdoDto.nombre) {
        const existingAcuerdo = await this.prisma.acuerdoArancelario.findFirst({
          where: { nombre: updateAcuerdoDto.nombre.trim() },
        });

        if (existingAcuerdo && existingAcuerdo.idAcuerdo !== id) {
          throw new BadRequestException(
            `Ya existe un acuerdo arancelario con el nombre ${updateAcuerdoDto.nombre}`,
          );
        }
      }

      const updateData: any = {};

      if (updateAcuerdoDto.nombre !== undefined) {
        updateData.nombre = updateAcuerdoDto.nombre.trim();
      }

      const updatedAcuerdo = await this.prisma.acuerdoArancelario.update({
        where: { idAcuerdo: id },
        data: updateData,
      });

      this.logger.log(`Acuerdo arancelario actualizado: ${id} - ${updatedAcuerdo.nombre}`);

      return updatedAcuerdo;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al actualizar acuerdo arancelario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al actualizar acuerdo arancelario');
    }
  }

  async remove(id: number) {
    try {
      const acuerdo = await this.prisma.acuerdoArancelario.findUnique({
        where: { idAcuerdo: id },
      });

      if (!acuerdo) {
        throw new NotFoundException(`Acuerdo arancelario con ID ${id} no encontrado`);
      }

      await this.prisma.acuerdoArancelario.delete({
        where: { idAcuerdo: id },
      });

      this.logger.log(`Acuerdo arancelario eliminado: ${id} - ${acuerdo.nombre}`);

      return {
        message: `Acuerdo arancelario ${acuerdo.nombre} eliminado exitosamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al eliminar acuerdo arancelario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al eliminar acuerdo arancelario');
    }
  }

  async findByName(nombre: string) {
    try {
      const acuerdos = await this.prisma.acuerdoArancelario.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
      });

      return acuerdos;
    } catch (error) {
      this.logger.error(`Error al buscar acuerdos arancelarios: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al buscar acuerdos arancelarios');
    }
  }
}