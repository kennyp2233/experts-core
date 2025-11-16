import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateTipoEmbalajeDto, UpdateTipoEmbalajeDto } from '../dto';
import { TipoEmbalajeEntity } from '../entities/tipo-embalaje.entity';

@Injectable()
export class TipoEmbalajeService {
    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(createDto: CreateTipoEmbalajeDto): Promise<TipoEmbalajeEntity> {
        try {
            // Validar que el nombre no esté duplicado
            const existingTipoEmbalaje = await this.prisma.tipoEmbalaje.findFirst({
                where: { nombre: createDto.nombre },
            });

            if (existingTipoEmbalaje) {
                throw new BadRequestException(
                    `Ya existe un tipo de embalaje con el nombre: ${createDto.nombre}`,
                );
            }

            const tipoEmbalaje = await this.prisma.tipoEmbalaje.create({
                data: createDto,
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoEmbalaje as TipoEmbalajeEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al crear el tipo de embalaje: ' + error.message,
            );
        }
    }

    async findAll(skip?: number, take?: number, search?: string): Promise<{ data: TipoEmbalajeEntity[], total: number, skip: number, take: number }> {
        try {
            const where = search ? {
                nombre: {
                    contains: search,
                    mode: 'insensitive' as const,
                },
            } : {};

            const [tiposEmbalaje, total] = await Promise.all([
                this.prisma.tipoEmbalaje.findMany({
                    where,
                    include: {
                        tiposEmbarque: true,
                    },
                    orderBy: { nombre: 'asc' },
                    skip,
                    take,
                }),
                this.prisma.tipoEmbalaje.count({ where }),
            ]);

            return {
                data: tiposEmbalaje as TipoEmbalajeEntity[],
                total,
                skip: skip || 0,
                take: take || total,
            };
        } catch (error) {
            throw new BadRequestException(
                'Error al obtener los tipos de embalaje: ' + error.message,
            );
        }
    }

    async findOne(id: number): Promise<TipoEmbalajeEntity> {
        try {
            const tipoEmbalaje = await this.prisma.tipoEmbalaje.findUnique({
                where: { id },
                include: {
                    tiposEmbarque: true,
                },
            });

            if (!tipoEmbalaje) {
                throw new NotFoundException(`Tipo de embalaje con ID ${id} no encontrado`);
            }

            return tipoEmbalaje as TipoEmbalajeEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al obtener el tipo de embalaje: ' + error.message,
            );
        }
    }

    async update(
        id: number,
        updateDto: UpdateTipoEmbalajeDto,
    ): Promise<TipoEmbalajeEntity> {
        try {
            // Verificar que el tipo de embalaje existe
            await this.findOne(id);

            // Si se está actualizando el nombre, validar que no esté duplicado
            if (updateDto.nombre) {
                const existingTipoEmbalaje = await this.prisma.tipoEmbalaje.findFirst({
                    where: {
                        nombre: updateDto.nombre,
                        id: { not: id },
                    },
                });

                if (existingTipoEmbalaje) {
                    throw new BadRequestException(
                        `Ya existe un tipo de embalaje con el nombre: ${updateDto.nombre}`,
                    );
                }
            }

            const tipoEmbalaje = await this.prisma.tipoEmbalaje.update({
                where: { id },
                data: updateDto,
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoEmbalaje as TipoEmbalajeEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al actualizar el tipo de embalaje: ' + error.message,
            );
        }
    }

    async remove(id: number): Promise<TipoEmbalajeEntity> {
        try {
            // Verificar que el tipo de embalaje existe
            await this.findOne(id);

            const tipoEmbalaje = await this.prisma.tipoEmbalaje.delete({
                where: { id },
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoEmbalaje as TipoEmbalajeEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al eliminar el tipo de embalaje: ' + error.message,
            );
        }
    }

    async findByNombre(nombre: string): Promise<TipoEmbalajeEntity | null> {
        try {
            const tipoEmbalaje = await this.prisma.tipoEmbalaje.findFirst({
                where: { nombre },
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoEmbalaje as TipoEmbalajeEntity | null;
        } catch (error) {
            throw new BadRequestException(
                'Error al buscar el tipo de embalaje por nombre: ' + error.message,
            );
        }
    }
}