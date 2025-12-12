import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateSubAgenciaDto, UpdateSubAgenciaDto } from '../dto';
import { SubAgenciaEntity } from '../entities/sub-agencia.entity';

@Injectable()
export class SubAgenciaService {
    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(createDto: CreateSubAgenciaDto): Promise<SubAgenciaEntity> {
        try {
            // Validar que el nombre no esté duplicado
            const existingSubAgencia = await this.prisma.subAgencia.findFirst({
                where: { nombre: createDto.nombre },
            });

            if (existingSubAgencia) {
                throw new BadRequestException(
                    `Ya existe una sub agencia con el nombre: ${createDto.nombre}`,
                );
            }

            const subAgencia = await this.prisma.subAgencia.create({
                data: createDto,
            });

            return subAgencia as SubAgenciaEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al crear la sub agencia: ' + error.message,
            );
        }
    }

    async findAll(skip?: number, take?: number): Promise<SubAgenciaEntity[]> {
        try {
            const subAgencias = await this.prisma.subAgencia.findMany({
                where: { estado: true },
                orderBy: { nombre: 'asc' },
                skip: skip,
                take: take,
            });

            return subAgencias as SubAgenciaEntity[];
        } catch (error) {
            throw new BadRequestException(
                'Error al obtener las sub agencias: ' + error.message,
            );
        }
    }

    async findOne(id: number): Promise<SubAgenciaEntity> {
        try {
            const subAgencia = await this.prisma.subAgencia.findUnique({
                where: { id },
            });

            if (!subAgencia) {
                throw new NotFoundException(`Sub agencia con ID ${id} no encontrada`);
            }

            return subAgencia as SubAgenciaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al obtener la sub agencia: ' + error.message,
            );
        }
    }

    async update(
        id: number,
        updateDto: UpdateSubAgenciaDto,
    ): Promise<SubAgenciaEntity> {
        try {
            // Verificar que la sub agencia existe
            await this.findOne(id);

            // Si se está actualizando el nombre, validar que no esté duplicado
            if (updateDto.nombre) {
                const existingSubAgencia = await this.prisma.subAgencia.findFirst({
                    where: {
                        nombre: updateDto.nombre,
                        id: { not: id },
                    },
                });

                if (existingSubAgencia) {
                    throw new BadRequestException(
                        `Ya existe una sub agencia con el nombre: ${updateDto.nombre}`,
                    );
                }
            }

            const subAgencia = await this.prisma.subAgencia.update({
                where: { id },
                data: updateDto,
            });

            return subAgencia as SubAgenciaEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al actualizar la sub agencia: ' + error.message,
            );
        }
    }

    async remove(id: number): Promise<SubAgenciaEntity> {
        try {
            // Verificar que la sub agencia existe
            await this.findOne(id);

            // Soft delete
            const subAgencia = await this.prisma.subAgencia.update({
                where: { id },
                data: { estado: false },
            });

            return subAgencia as SubAgenciaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al eliminar la sub agencia: ' + error.message,
            );
        }
    }

    async findByNombre(nombre: string): Promise<SubAgenciaEntity | null> {
        try {
            const subAgencia = await this.prisma.subAgencia.findFirst({
                where: { nombre },
            });

            return subAgencia as SubAgenciaEntity | null;
        } catch (error) {
            throw new BadRequestException(
                'Error al buscar la sub agencia por nombre: ' + error.message,
            );
        }
    }
}