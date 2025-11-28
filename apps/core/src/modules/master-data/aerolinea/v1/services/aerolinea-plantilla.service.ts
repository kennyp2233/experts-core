import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateAerolineaPlantillaDto, UpdateAerolineaPlantillaDto, CreateConceptoCostoDto, UpdateConceptoCostoDto } from '../dto/aerolinea-plantilla.dto';
import { AerolineaPlantillaEntity } from '../entities/aerolinea-plantilla.entity';
import { ConceptoCostoEntity } from '../entities/concepto-costo.entity';

@Injectable()
export class AerolineaPlantillaService {
    constructor(@Inject('PrismaClientDatosMaestros') private readonly prisma: PrismaClient) { }

    async createPlantilla(aerolineaId: number, createAerolineaPlantillaDto: CreateAerolineaPlantillaDto): Promise<AerolineaPlantillaEntity> {
        try {
            const plantilla = await this.prisma.aerolineasPlantilla.create({
                data: {
                    idAerolinea: aerolineaId,
                    plantillaGuiaMadre: createAerolineaPlantillaDto.plantillaGuiaMadre,
                    plantillaFormatoAerolinea: createAerolineaPlantillaDto.plantillaFormatoAerolinea,
                    plantillaReservas: createAerolineaPlantillaDto.plantillaReservas,
                    tarifaRate: createAerolineaPlantillaDto.tarifaRate,
                    pca: createAerolineaPlantillaDto.pca,
                },
                include: {
                    aerolinea: true,
                    conceptos: {
                        include: {
                            plantilla: true,
                        },
                    },
                },
            });
            return plantilla as AerolineaPlantillaEntity;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error creating aerolinea plantilla: ${message}`);
        }
    }

    async findPlantilla(aerolineaId: number): Promise<AerolineaPlantillaEntity | null> {
        try {
            const plantilla = await this.prisma.aerolineasPlantilla.findUnique({
                where: { idAerolinea: aerolineaId },
                include: {
                    aerolinea: true,
                    conceptos: {
                        include: {
                            plantilla: true,
                        },
                    },
                },
            });
            return plantilla as AerolineaPlantillaEntity;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error finding plantilla for aerolinea: ${message}`);
        }
    }

    async updatePlantilla(aerolineaId: number, updateAerolineaPlantillaDto: UpdateAerolineaPlantillaDto): Promise<AerolineaPlantillaEntity> {
        try {
            // Check if plantilla exists for the aerolinea
            const existingPlantilla = await this.findPlantilla(aerolineaId);
            if (!existingPlantilla) {
                throw new NotFoundException(`Plantilla for aerolinea ${aerolineaId} not found`);
            }

            // Destructure conceptos out of the DTO to avoid Prisma errors
            const { conceptos, ...plantillaData } = updateAerolineaPlantillaDto;

            const updatedPlantilla = await this.prisma.aerolineasPlantilla.update({
                where: { idAerolinea: aerolineaId },
                data: plantillaData,
                include: {
                    aerolinea: true,
                    conceptos: {
                        include: {
                            plantilla: true,
                        },
                    },
                },
            });
            return updatedPlantilla as AerolineaPlantillaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error updating aerolinea plantilla: ${message}`);
        }
    }

    async removePlantilla(aerolineaId: number): Promise<void> {
        try {
            // Check if plantilla exists for the aerolinea
            const existingPlantilla = await this.findPlantilla(aerolineaId);
            if (!existingPlantilla) {
                throw new NotFoundException(`Plantilla for aerolinea ${aerolineaId} not found`);
            }

            await this.prisma.aerolineasPlantilla.delete({
                where: { idAerolinea: aerolineaId },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error removing aerolinea plantilla: ${message}`);
        }
    }

    async createConcepto(plantillaId: number, createConceptoCostoDto: CreateConceptoCostoDto): Promise<ConceptoCostoEntity> {
        try {
            const concepto = await this.prisma.conceptoCosto.create({
                data: {
                    ...createConceptoCostoDto,
                    plantillaId,
                },
                include: {
                    plantilla: {
                        include: {
                            aerolinea: true,
                        },
                    },
                },
            });
            return concepto as ConceptoCostoEntity;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error creating concepto costo: ${message}`);
        }
    }

    async findConceptosByPlantilla(plantillaId: number): Promise<ConceptoCostoEntity[]> {
        try {
            const conceptos = await this.prisma.conceptoCosto.findMany({
                where: { plantillaId },
                include: {
                    plantilla: {
                        include: {
                            aerolinea: true,
                        },
                    },
                },
            });
            return conceptos as ConceptoCostoEntity[];
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error finding conceptos for plantilla: ${message}`);
        }
    }

    async findConceptoById(plantillaId: number, conceptoId: number): Promise<ConceptoCostoEntity> {
        try {
            const concepto = await this.prisma.conceptoCosto.findFirst({
                where: {
                    id: conceptoId,
                    plantillaId,
                },
                include: {
                    plantilla: {
                        include: {
                            aerolinea: true,
                        },
                    },
                },
            });

            if (!concepto) {
                throw new NotFoundException(`ConceptoCosto with ID ${conceptoId} for plantilla ${plantillaId} not found`);
            }

            return concepto as ConceptoCostoEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error finding concepto costo: ${message}`);
        }
    }

    async updateConcepto(plantillaId: number, conceptoId: number, updateConceptoCostoDto: UpdateConceptoCostoDto): Promise<ConceptoCostoEntity> {
        try {
            // Check if concepto exists and belongs to the plantilla
            await this.findConceptoById(plantillaId, conceptoId);

            const updatedConcepto = await this.prisma.conceptoCosto.update({
                where: { id: conceptoId },
                data: updateConceptoCostoDto,
                include: {
                    plantilla: {
                        include: {
                            aerolinea: true,
                        },
                    },
                },
            });
            return updatedConcepto as ConceptoCostoEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error updating concepto costo: ${message}`);
        }
    }

    async removeConcepto(plantillaId: number, conceptoId: number): Promise<void> {
        try {
            // Check if concepto exists and belongs to the plantilla
            await this.findConceptoById(plantillaId, conceptoId);

            await this.prisma.conceptoCosto.delete({
                where: { id: conceptoId },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error removing concepto costo: ${message}`);
        }
    }

    async createPlantillaWithConceptos(aerolineaId: number, createAerolineaPlantillaDto: CreateAerolineaPlantillaDto): Promise<AerolineaPlantillaEntity> {
        try {
            const plantilla = await this.prisma.aerolineasPlantilla.create({
                data: {
                    idAerolinea: aerolineaId,
                    plantillaGuiaMadre: createAerolineaPlantillaDto.plantillaGuiaMadre,
                    plantillaFormatoAerolinea: createAerolineaPlantillaDto.plantillaFormatoAerolinea,
                    plantillaReservas: createAerolineaPlantillaDto.plantillaReservas,
                    tarifaRate: createAerolineaPlantillaDto.tarifaRate,
                    pca: createAerolineaPlantillaDto.pca,
                    conceptos: {
                        create: createAerolineaPlantillaDto.conceptos?.map(concepto => ({
                            tipo: concepto.tipo,
                            abreviatura: concepto.abreviatura,
                            valor: concepto.valor,
                            multiplicador: concepto.multiplicador,
                        })) || [],
                    },
                },
                include: {
                    aerolinea: true,
                    conceptos: {
                        include: {
                            plantilla: true,
                        },
                    },
                },
            });
            return plantilla as AerolineaPlantillaEntity;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error creating aerolinea plantilla with conceptos: ${message}`);
        }
    }
}