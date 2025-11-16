import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateBodegueroDto, UpdateBodegueroDto } from '../dto';
import { Bodeguero } from '../entities/bodeguero.entity';

@Injectable()
export class BodegueroService {
  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async create(createDto: CreateBodegueroDto): Promise<Bodeguero> {
    try {
      // Validar que la CI no esté duplicada
      const existingBodeguero = await this.prisma.bodeguero.findFirst({
        where: { ci: createDto.ci },
      });

      if (existingBodeguero) {
        throw new BadRequestException(
          `Ya existe un bodeguero con la cédula de identidad: ${createDto.ci}`,
        );
      }

      // Validar que la clave de bodega no esté duplicada
      const existingClave = await this.prisma.bodeguero.findFirst({
        where: { claveBodega: createDto.claveBodega },
      });

      if (existingClave) {
        throw new BadRequestException(
          `Ya existe un bodeguero con la clave de bodega: ${createDto.claveBodega}`,
        );
      }

      const bodeguero = await this.prisma.bodeguero.create({
        data: createDto,
      });

      return bodeguero;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Error al crear el bodeguero: ' + error.message,
      );
    }
  }

  async findAll(skip?: number, take?: number): Promise<Bodeguero[]> {
    try {
      return await this.prisma.bodeguero.findMany({
        orderBy: { nombre: 'asc' },
        skip: skip,
        take: take,
      });
    } catch (error) {
      throw new BadRequestException(
        'Error al obtener los bodegueros: ' + error.message,
      );
    }
  }

  async findOne(id: number): Promise<Bodeguero> {
    try {
      const bodeguero = await this.prisma.bodeguero.findUnique({
        where: { id },
      });

      if (!bodeguero) {
        throw new NotFoundException(`Bodeguero con ID ${id} no encontrado`);
      }

      return bodeguero;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Error al obtener el bodeguero: ' + error.message,
      );
    }
  }

  async update(id: number, updateDto: UpdateBodegueroDto): Promise<Bodeguero> {
    try {
      // Verificar que el bodeguero existe
      await this.findOne(id);

      // Validar que la CI no esté duplicada (si se está actualizando)
      if (updateDto.ci) {
        const existingBodeguero = await this.prisma.bodeguero.findFirst({
          where: {
            ci: updateDto.ci,
            id: { not: id },
          },
        });

        if (existingBodeguero) {
          throw new BadRequestException(
            `Ya existe otro bodeguero con la cédula de identidad: ${updateDto.ci}`,
          );
        }
      }

      // Validar que la clave de bodega no esté duplicada (si se está actualizando)
      if (updateDto.claveBodega) {
        const existingClave = await this.prisma.bodeguero.findFirst({
          where: {
            claveBodega: updateDto.claveBodega,
            id: { not: id },
          },
        });

        if (existingClave) {
          throw new BadRequestException(
            `Ya existe otro bodeguero con la clave de bodega: ${updateDto.claveBodega}`,
          );
        }
      }

      const bodeguero = await this.prisma.bodeguero.update({
        where: { id },
        data: updateDto,
      });

      return bodeguero;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Error al actualizar el bodeguero: ' + error.message,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      // Verificar que el bodeguero existe
      await this.findOne(id);

      await this.prisma.bodeguero.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Error al eliminar el bodeguero: ' + error.message,
      );
    }
  }

  async findByNombre(nombre: string): Promise<Bodeguero[]> {
    try {
      return await this.prisma.bodeguero.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        orderBy: { nombre: 'asc' },
      });
    } catch (error) {
      throw new BadRequestException(
        'Error al buscar bodegueros por nombre: ' + error.message,
      );
    }
  }
}