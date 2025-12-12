import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateAgenciaIataDto, UpdateAgenciaIataDto } from '../dto';
import { AgenciaIataEntity } from '../entities/agencia-iata.entity';

@Injectable()
export class AgenciaIataService {
    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(createDto: CreateAgenciaIataDto): Promise<AgenciaIataEntity> {
        try {
            // Validar que el nombreShipper no esté duplicado
            const existingAgencia = await this.prisma.agenciaIata.findFirst({
                where: { nombreShipper: createDto.nombreShipper },
            });

            if (existingAgencia) {
                throw new BadRequestException(
                    `Ya existe una agencia IATA con el nombre: ${createDto.nombreShipper}`,
                );
            }

            const agenciaIata = await this.prisma.agenciaIata.create({
                data: createDto,
            });

            return agenciaIata as AgenciaIataEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al crear la agencia IATA: ' + error.message,
            );
        }
    }

    async findAll(skip?: number, take?: number): Promise<AgenciaIataEntity[]> {
        try {
            const agencias = await this.prisma.agenciaIata.findMany({
                where: { estado: true },
                orderBy: { nombreShipper: 'asc' },
                skip: skip,
                take: take,
            });

            return agencias as AgenciaIataEntity[];
        } catch (error) {
            throw new BadRequestException(
                'Error al obtener las agencias IATA: ' + error.message,
            );
        }
    }

    async findOne(id: number): Promise<AgenciaIataEntity> {
        try {
            const agenciaIata = await this.prisma.agenciaIata.findUnique({
                where: { id },
            });

            if (!agenciaIata) {
                throw new NotFoundException(`Agencia IATA con ID ${id} no encontrada`);
            }

            return agenciaIata as AgenciaIataEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al obtener la agencia IATA: ' + error.message,
            );
        }
    }

    async update(
        id: number,
        updateDto: UpdateAgenciaIataDto,
    ): Promise<AgenciaIataEntity> {
        try {
            // Verificar que la agencia existe
            await this.findOne(id);

            // Si se está actualizando el nombreShipper, validar que no esté duplicado
            if (updateDto.nombreShipper) {
                const existingAgencia = await this.prisma.agenciaIata.findFirst({
                    where: {
                        nombreShipper: updateDto.nombreShipper,
                        id: { not: id },
                    },
                });

                if (existingAgencia) {
                    throw new BadRequestException(
                        `Ya existe una agencia IATA con el nombre: ${updateDto.nombreShipper}`,
                    );
                }
            } const agenciaIata = await this.prisma.agenciaIata.update({
                where: { id },
                data: updateDto,
            });

            return agenciaIata as AgenciaIataEntity;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al actualizar la agencia IATA: ' + error.message,
            );
        }
    }

    async remove(id: number): Promise<AgenciaIataEntity> {
        try {
            // Verificar que la agencia existe
            await this.findOne(id);

            // Soft delete
            const agenciaIata = await this.prisma.agenciaIata.update({
                where: { id },
                data: { estado: false },
            });

            return agenciaIata as AgenciaIataEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                'Error al eliminar la agencia IATA: ' + error.message,
            );
        }
    }

    async findByNombreShipper(nombreShipper: string): Promise<AgenciaIataEntity | null> {
        try {
            const agenciaIata = await this.prisma.agenciaIata.findFirst({
                where: { nombreShipper },
            });

            return agenciaIata as AgenciaIataEntity | null;
        } catch (error) {
            throw new BadRequestException(
                'Error al buscar la agencia IATA por nombre: ' + error.message,
            );
        }
    }

    async findByNombre(nombre: string): Promise<AgenciaIataEntity[]> {
        try {
            const agencias = await this.prisma.agenciaIata.findMany({
                where: {
                    estado: true,
                    nombreShipper: {
                        contains: nombre,
                        mode: 'insensitive',
                    },
                },
                orderBy: { nombreShipper: 'asc' },
            });

            return agencias as AgenciaIataEntity[];
        } catch (error) {
            throw new BadRequestException(
                'Error al buscar agencias IATA por nombre: ' + error.message,
            );
        }
    }
}