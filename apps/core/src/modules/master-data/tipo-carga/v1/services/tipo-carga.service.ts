import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateTipoCargaDto, UpdateTipoCargaDto } from '../dto';
import { TipoCargaEntity } from '../entities/tipo-carga.entity';

@Injectable()
export class TipoCargaService {
    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(createDto: CreateTipoCargaDto): Promise<TipoCargaEntity> {
        try {
            // Validar que el nombre no esté duplicado
            const existingTipoCarga = await this.prisma.tipoCarga.findFirst({
                where: { nombre: createDto.nombre },
            });

            if (existingTipoCarga) {
                throw new BadRequestException(
                    `Ya existe un tipo de carga con el nombre: ${createDto.nombre}`,
                );
            }

            const tipoCarga = await this.prisma.tipoCarga.create({
                data: createDto,
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoCarga as TipoCargaEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al crear el tipo de carga: ' + error.message,
            );
        }
    }

    async findAll(): Promise<TipoCargaEntity[]> {
        try {
            const tiposCarga = await this.prisma.tipoCarga.findMany({
                include: {
                    tiposEmbarque: true,
                },
                orderBy: { nombre: 'asc' },
            });

            return tiposCarga as TipoCargaEntity[];
        } catch (error) {
            throw new BadRequestException(
                'Error al obtener los tipos de carga: ' + error.message,
            );
        }
    }

    async findOne(id: number): Promise<TipoCargaEntity> {
        try {
            const tipoCarga = await this.prisma.tipoCarga.findUnique({
                where: { id },
                include: {
                    tiposEmbarque: true,
                },
            });

            if (!tipoCarga) {
                throw new NotFoundException(`Tipo de carga con ID ${id} no encontrado`);
            }

            return tipoCarga as TipoCargaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al obtener el tipo de carga: ' + error.message,
            );
        }
    }

    async update(
        id: number,
        updateDto: UpdateTipoCargaDto,
    ): Promise<TipoCargaEntity> {
        try {
            // Verificar que el tipo de carga existe
            await this.findOne(id);

            // Si se está actualizando el nombre, validar que no esté duplicado
            if (updateDto.nombre) {
                const existingTipoCarga = await this.prisma.tipoCarga.findFirst({
                    where: {
                        nombre: updateDto.nombre,
                        id: { not: id },
                    },
                });

                if (existingTipoCarga) {
                    throw new BadRequestException(
                        `Ya existe un tipo de carga con el nombre: ${updateDto.nombre}`,
                    );
                }
            }

            const tipoCarga = await this.prisma.tipoCarga.update({
                where: { id },
                data: updateDto,
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoCarga as TipoCargaEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al actualizar el tipo de carga: ' + error.message,
            );
        }
    }

    async remove(id: number): Promise<TipoCargaEntity> {
        try {
            // Verificar que el tipo de carga existe
            await this.findOne(id);

            const tipoCarga = await this.prisma.tipoCarga.delete({
                where: { id },
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoCarga as TipoCargaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al eliminar el tipo de carga: ' + error.message,
            );
        }
    }

    async findByNombre(nombre: string): Promise<TipoCargaEntity | null> {
        try {
            const tipoCarga = await this.prisma.tipoCarga.findFirst({
                where: { nombre },
                include: {
                    tiposEmbarque: true,
                },
            });

            return tipoCarga as TipoCargaEntity | null;
        } catch (error) {
            throw new BadRequestException(
                'Error al buscar el tipo de carga por nombre: ' + error.message,
            );
        }
    }
}