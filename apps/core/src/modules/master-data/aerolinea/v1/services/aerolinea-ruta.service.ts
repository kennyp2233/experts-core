import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateAerolineaRutaDto, UpdateAerolineaRutaDto } from '../dto/aerolinea-ruta.dto';
import { AerolineaRutaEntity } from '../entities/aerolinea-ruta.entity';

@Injectable()
export class AerolineaRutaService {
    constructor(@Inject('PrismaClientDatosMaestros') private readonly prisma: PrismaClient) { }

    async createRuta(aerolineaId: number, createAerolineaRutaDto: CreateAerolineaRutaDto): Promise<AerolineaRutaEntity> {
        try {
            // Validate foreign keys
            await this.validateRutaForeignKeys(createAerolineaRutaDto);

            const ruta = await this.prisma.aerolineaRuta.create({
                data: {
                    ...createAerolineaRutaDto,
                    aerolineaId,
                },
                include: {
                    aerolinea: true,
                    origen: true,
                    destino: true,
                    viaAerolinea: true,
                },
            });
            return ruta as AerolineaRutaEntity;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error creating aerolinea ruta: ${message}`);
        }
    }

    async findRutasByAerolinea(aerolineaId: number): Promise<AerolineaRutaEntity[]> {
        try {
            const rutas = await this.prisma.aerolineaRuta.findMany({
                where: { aerolineaId },
                include: {
                    aerolinea: true,
                    origen: true,
                    destino: true,
                    viaAerolinea: true,
                },
                orderBy: { orden: 'asc' },
            });
            return rutas as AerolineaRutaEntity[];
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error finding rutas for aerolinea: ${message}`);
        }
    }

    async findRutaById(aerolineaId: number, rutaId: number): Promise<AerolineaRutaEntity> {
        try {
            const ruta = await this.prisma.aerolineaRuta.findFirst({
                where: {
                    id: rutaId,
                    aerolineaId,
                },
                include: {
                    aerolinea: true,
                    origen: true,
                    destino: true,
                    viaAerolinea: true,
                },
            });

            if (!ruta) {
                throw new NotFoundException(`AerolineaRuta with ID ${rutaId} for aerolinea ${aerolineaId} not found`);
            }

            return ruta as AerolineaRutaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error finding aerolinea ruta: ${message}`);
        }
    }

    async updateRuta(aerolineaId: number, rutaId: number, updateAerolineaRutaDto: UpdateAerolineaRutaDto): Promise<AerolineaRutaEntity> {
        try {
            // Check if ruta exists and belongs to the aerolinea
            await this.findRutaById(aerolineaId, rutaId);

            // Validate foreign keys if provided
            if (updateAerolineaRutaDto.origenId || updateAerolineaRutaDto.destinoId || updateAerolineaRutaDto.viaAerolineaId) {
                await this.validateRutaForeignKeys(updateAerolineaRutaDto as CreateAerolineaRutaDto);
            }

            const updatedRuta = await this.prisma.aerolineaRuta.update({
                where: { id: rutaId },
                data: updateAerolineaRutaDto,
                include: {
                    aerolinea: true,
                    origen: true,
                    destino: true,
                    viaAerolinea: true,
                },
            });
            return updatedRuta as AerolineaRutaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error updating aerolinea ruta: ${message}`);
        }
    }

    async removeRuta(aerolineaId: number, rutaId: number): Promise<void> {
        try {
            // Check if ruta exists and belongs to the aerolinea
            await this.findRutaById(aerolineaId, rutaId);

            await this.prisma.aerolineaRuta.delete({
                where: { id: rutaId },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error removing aerolinea ruta: ${message}`);
        }
    }

    private async validateRutaForeignKeys(dto: CreateAerolineaRutaDto): Promise<void> {
        // Validate origen if provided
        if (dto.origenId) {
            const origen = await this.prisma.origen.findUnique({
                where: { id: dto.origenId },
            });
            if (!origen) {
                throw new BadRequestException(`Origen with ID ${dto.origenId} not found`);
            }
        }

        // Validate destino if provided
        if (dto.destinoId) {
            const destino = await this.prisma.destino.findUnique({
                where: { id: dto.destinoId },
            });
            if (!destino) {
                throw new BadRequestException(`Destino with ID ${dto.destinoId} not found`);
            }
        }

        // Validate viaAerolinea if provided
        if (dto.viaAerolineaId) {
            const viaAerolinea = await this.prisma.aerolinea.findUnique({
                where: { id: dto.viaAerolineaId },
            });
            if (!viaAerolinea) {
                throw new BadRequestException(`Via Aerolinea with ID ${dto.viaAerolineaId} not found`);
            }
        }
    }
}