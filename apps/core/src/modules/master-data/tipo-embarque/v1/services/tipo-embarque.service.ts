import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateTipoEmbarqueDto, UpdateTipoEmbarqueDto } from '../dto';
import { TipoEmbarqueEntity } from '../entities/tipo-embarque.entity';

@Injectable()
export class TipoEmbarqueService {
    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(createDto: CreateTipoEmbarqueDto): Promise<TipoEmbarqueEntity> {
        try {
            // Validar que el nombre no esté duplicado
            const existingTipoEmbarque = await this.prisma.tipoEmbarque.findFirst({
                where: { nombre: createDto.nombre },
            });

            if (existingTipoEmbarque) {
                throw new BadRequestException(
                    `Ya existe un tipo de embarque con el nombre: ${createDto.nombre}`,
                );
            }

            const tipoEmbarque = await this.prisma.tipoEmbarque.create({
                data: createDto,
                include: {
                    carga: true,
                    embalaje: true,
                },
            });

            return tipoEmbarque as TipoEmbarqueEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al crear el tipo de embarque: ' + error.message,
            );
        }
    }

    async findAll(): Promise<TipoEmbarqueEntity[]> {
        try {
            const tiposEmbarque = await this.prisma.tipoEmbarque.findMany({
                include: {
                    carga: true,
                    embalaje: true,
                },
                orderBy: { nombre: 'asc' },
            });

            return tiposEmbarque as TipoEmbarqueEntity[];
        } catch (error) {
            throw new BadRequestException(
                'Error al obtener los tipos de embarque: ' + error.message,
            );
        }
    }

    async findOne(id: number): Promise<TipoEmbarqueEntity> {
        try {
            const tipoEmbarque = await this.prisma.tipoEmbarque.findUnique({
                where: { id },
                include: {
                    carga: true,
                    embalaje: true,
                },
            });

            if (!tipoEmbarque) {
                throw new NotFoundException(`Tipo de embarque con ID ${id} no encontrado`);
            }

            return tipoEmbarque as TipoEmbarqueEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al obtener el tipo de embarque: ' + error.message,
            );
        }
    }

    async update(
        id: number,
        updateDto: UpdateTipoEmbarqueDto,
    ): Promise<TipoEmbarqueEntity> {
        try {
            // Verificar que el tipo de embarque existe
            await this.findOne(id);

            // Si se está actualizando el nombre, validar que no esté duplicado
            if (updateDto.nombre) {
                const existingTipoEmbarque = await this.prisma.tipoEmbarque.findFirst({
                    where: {
                        nombre: updateDto.nombre,
                        id: { not: id },
                    },
                });

                if (existingTipoEmbarque) {
                    throw new BadRequestException(
                        `Ya existe un tipo de embarque con el nombre: ${updateDto.nombre}`,
                    );
                }
            }

            const tipoEmbarque = await this.prisma.tipoEmbarque.update({
                where: { id },
                data: updateDto,
                include: {
                    carga: true,
                    embalaje: true,
                },
            });

            return tipoEmbarque as TipoEmbarqueEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al actualizar el tipo de embarque: ' + error.message,
            );
        }
    }

    async remove(id: number): Promise<TipoEmbarqueEntity> {
        try {
            // Verificar que el tipo de embarque existe
            await this.findOne(id);

            const tipoEmbarque = await this.prisma.tipoEmbarque.delete({
                where: { id },
                include: {
                    carga: true,
                    embalaje: true,
                },
            });

            return tipoEmbarque as TipoEmbarqueEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al eliminar el tipo de embarque: ' + error.message,
            );
        }
    }

    async findByNombre(nombre: string): Promise<TipoEmbarqueEntity | null> {
        try {
            const tipoEmbarque = await this.prisma.tipoEmbarque.findFirst({
                where: { nombre },
                include: {
                    carga: true,
                    embalaje: true,
                },
            });

            return tipoEmbarque as TipoEmbarqueEntity | null;
        } catch (error) {
            throw new BadRequestException(
                'Error al buscar el tipo de embarque por nombre: ' + error.message,
            );
        }
    }
}