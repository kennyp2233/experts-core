import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateAerolineaDto, UpdateAerolineaDto } from '../dto/create-aerolinea.dto';
import { CreateAerolineaRutaDto, UpdateAerolineaRutaDto } from '../dto/aerolinea-ruta.dto';
import { CreateAerolineaPlantillaDto, UpdateAerolineaPlantillaDto, CreateConceptoCostoDto, UpdateConceptoCostoDto } from '../dto/aerolinea-plantilla.dto';
import { PaginationResponseDto } from '../dto/pagination-response.dto';
import { AerolineaEntity } from '../entities/aerolinea.entity';
import { AerolineaRutaEntity } from '../entities/aerolinea-ruta.entity';
import { AerolineaPlantillaEntity } from '../entities/aerolinea-plantilla.entity';
import { ConceptoCostoEntity } from '../entities/concepto-costo.entity';
import { AerolineaRutaService } from './aerolinea-ruta.service';
import { AerolineaPlantillaService } from './aerolinea-plantilla.service';

@Injectable()
export class AerolineaService {
    constructor(
        @Inject('PrismaClientDatosMaestros') private readonly prisma: PrismaClient,
        private readonly aerolineaRutaService: AerolineaRutaService,
        private readonly aerolineaPlantillaService: AerolineaPlantillaService,
    ) { }

    // ===== AEROLINEA CRUD =====

    async create(createAerolineaDto: CreateAerolineaDto): Promise<AerolineaEntity> {
        try {
            // Crear la aerolínea primero
            const aerolinea = await this.prisma.aerolinea.create({
                data: {
                    nombre: createAerolineaDto.nombre,
                    ciRuc: createAerolineaDto.ciRuc,
                    direccion: createAerolineaDto.direccion,
                    telefono: createAerolineaDto.telefono,
                    email: createAerolineaDto.email,
                    ciudad: createAerolineaDto.ciudad,
                    pais: createAerolineaDto.pais,
                    contacto: createAerolineaDto.contacto,
                    modo: createAerolineaDto.modo,
                    maestraGuiasHijas: createAerolineaDto.maestraGuiasHijas,
                    codigo: createAerolineaDto.codigo,
                    prefijoAwb: createAerolineaDto.prefijoAwb,
                    codigoCae: createAerolineaDto.codigoCae,
                    estado: createAerolineaDto.estado ?? true,
                    afiliadoCass: createAerolineaDto.afiliadoCass,
                    guiasVirtuales: createAerolineaDto.guiasVirtuales,
                },
            });

            // Crear rutas si están incluidas
            if (createAerolineaDto.rutas && createAerolineaDto.rutas.length > 0) {
                for (const rutaDto of createAerolineaDto.rutas) {
                    await this.aerolineaRutaService.createRuta(aerolinea.id, rutaDto);
                }
            }

            // Crear plantilla si está incluida
            if (createAerolineaDto.plantilla) {
                await this.aerolineaPlantillaService.createPlantillaWithConceptos(aerolinea.id, createAerolineaDto.plantilla);
            }

            // Obtener la aerolínea completa con todas las relaciones
            return await this.findOne(aerolinea.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error creating aerolinea: ${message}`);
        }
    }

    async findAll(
        skip = 0,
        take = 10,
        sortField = 'nombre',
        sortOrder = 'asc'
    ): Promise<PaginationResponseDto<AerolineaEntity>> {
        try {
            const [aerolineas, total] = await Promise.all([
                this.prisma.aerolinea.findMany({
                    where: { estado: true },
                    include: {
                        aerolineasPlantilla: {
                            include: {
                                conceptos: true,
                            },
                        },
                        rutas: {
                            include: {
                                origen: true,
                                destino: true,
                                viaAerolinea: true,
                            },
                        },
                        viasAerolineas: {
                            include: {
                                aerolinea: true,
                                origen: true,
                                destino: true,
                            },
                        },
                    },
                    orderBy: { [sortField]: sortOrder },
                    skip,
                    take,
                }),
                this.prisma.aerolinea.count({ where: { estado: true } }),
            ]);

            return {
                data: aerolineas as AerolineaEntity[],
                total,
                skip,
                take,
            };
        } catch (error) {
            throw new BadRequestException(`Error finding aerolineas: ${error.message}`);
        }
    }

    async findOne(id: number): Promise<AerolineaEntity> {
        try {
            const aerolinea = await this.prisma.aerolinea.findUnique({
                where: { id },
                include: {
                    aerolineasPlantilla: {
                        include: {
                            conceptos: true,
                        },
                    },
                    rutas: {
                        include: {
                            origen: true,
                            destino: true,
                            viaAerolinea: true,
                        },
                        orderBy: { orden: 'asc' },
                    },
                    viasAerolineas: {
                        include: {
                            aerolinea: true,
                            origen: true,
                            destino: true,
                            viaAerolinea: true, // Include self-reference for viaAerolinea details if needed
                        },
                        orderBy: { orden: 'asc' },
                    },
                },
            });

            if (!aerolinea) {
                throw new NotFoundException(`Aerolinea with ID ${id} not found`);
            }

            return aerolinea as AerolineaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`Error finding aerolinea: ${error.message}`);
        }
    }

    async update(id: number, updateAerolineaDto: UpdateAerolineaDto): Promise<AerolineaEntity> {
        try {
            // Check if aerolinea exists
            await this.findOne(id);

            // Extraer solo los campos de aerolínea (excluir rutas y plantilla)
            const { rutas, plantilla, ...aerolineaData } = updateAerolineaDto;

            const aerolinea = await this.prisma.aerolinea.update({
                where: { id },
                data: aerolineaData,
            });

            // Actualizar rutas si están incluidas
            if (rutas) {
                // Eliminar rutas existentes
                await this.prisma.aerolineaRuta.deleteMany({
                    where: { aerolineaId: id },
                });

                // Crear nuevas rutas
                if (rutas.length > 0) {
                    for (const rutaDto of rutas) {
                        await this.aerolineaRutaService.createRuta(id, rutaDto);
                    }
                }
            }

            // Retornar la aerolínea actualizada con sus relaciones
            return await this.findOne(id);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`Error updating aerolinea: ${error.message}`);
        }
    }

    async remove(id: number): Promise<AerolineaEntity> {
        try {
            // Check if aerolinea exists
            await this.findOne(id);

            // Soft delete by setting estado to false
            const aerolinea = await this.prisma.aerolinea.update({
                where: { id },
                data: { estado: false },
                include: {
                    aerolineasPlantilla: {
                        include: {
                            conceptos: true,
                        },
                    },
                    rutas: {
                        include: {
                            origen: true,
                            destino: true,
                            viaAerolinea: true,
                        },
                    },
                    viasAerolineas: {
                        include: {
                            aerolinea: true,
                            origen: true,
                            destino: true,
                        },
                    },
                },
            });
            return aerolinea as AerolineaEntity;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`Error removing aerolinea: ${error.message}`);
        }
    }

    async findByCodigo(codigo: string): Promise<AerolineaEntity | null> {
        try {
            const aerolinea = await this.prisma.aerolinea.findFirst({
                where: {
                    codigo,
                    estado: true,
                },
                include: {
                    aerolineasPlantilla: {
                        include: {
                            conceptos: true,
                        },
                    },
                    rutas: {
                        include: {
                            origen: true,
                            destino: true,
                            viaAerolinea: true,
                        },
                    },
                    viasAerolineas: {
                        include: {
                            aerolinea: true,
                            origen: true,
                            destino: true,
                        },
                    },
                },
            });
            return aerolinea as AerolineaEntity | null;
        } catch (error) {
            throw new BadRequestException(`Error finding aerolinea by codigo: ${error.message}`);
        }
    }

    // ===== AEROLINEA RUTA OPERATIONS =====

    async createRuta(aerolineaId: number, createAerolineaRutaDto: CreateAerolineaRutaDto): Promise<AerolineaRutaEntity> {
        return this.aerolineaRutaService.createRuta(aerolineaId, createAerolineaRutaDto);
    }

    async findRutasByAerolinea(aerolineaId: number): Promise<AerolineaRutaEntity[]> {
        return this.aerolineaRutaService.findRutasByAerolinea(aerolineaId);
    }

    async findRutaById(aerolineaId: number, rutaId: number): Promise<AerolineaRutaEntity> {
        return this.aerolineaRutaService.findRutaById(aerolineaId, rutaId);
    }

    async updateRuta(aerolineaId: number, rutaId: number, updateAerolineaRutaDto: UpdateAerolineaRutaDto): Promise<AerolineaRutaEntity> {
        return this.aerolineaRutaService.updateRuta(aerolineaId, rutaId, updateAerolineaRutaDto);
    }

    async removeRuta(aerolineaId: number, rutaId: number): Promise<void> {
        return this.aerolineaRutaService.removeRuta(aerolineaId, rutaId);
    }

    // ===== AEROLINEA PLANTILLA OPERATIONS =====

    async createPlantilla(aerolineaId: number, createAerolineaPlantillaDto: CreateAerolineaPlantillaDto): Promise<AerolineaPlantillaEntity> {
        return this.aerolineaPlantillaService.createPlantilla(aerolineaId, createAerolineaPlantillaDto);
    }

    async findPlantilla(aerolineaId: number): Promise<AerolineaPlantillaEntity | null> {
        return this.aerolineaPlantillaService.findPlantilla(aerolineaId);
    }

    async updatePlantilla(aerolineaId: number, updateAerolineaPlantillaDto: UpdateAerolineaPlantillaDto): Promise<AerolineaPlantillaEntity> {
        return this.aerolineaPlantillaService.updatePlantilla(aerolineaId, updateAerolineaPlantillaDto);
    }

    async removePlantilla(aerolineaId: number): Promise<void> {
        return this.aerolineaPlantillaService.removePlantilla(aerolineaId);
    }

    // ===== CONCEPTO COSTO OPERATIONS =====

    async createConcepto(aerolineaId: number, createConceptoCostoDto: CreateConceptoCostoDto): Promise<ConceptoCostoEntity> {
        // First get the plantilla for this aerolinea
        const plantilla = await this.aerolineaPlantillaService.findPlantilla(aerolineaId);
        if (!plantilla) {
            throw new NotFoundException(`Plantilla not found for aerolinea ${aerolineaId}`);
        }
        return this.aerolineaPlantillaService.createConcepto(plantilla.idAerolinea, createConceptoCostoDto);
    }

    async findConceptosByPlantilla(aerolineaId: number): Promise<ConceptoCostoEntity[]> {
        // First get the plantilla for this aerolinea
        const plantilla = await this.aerolineaPlantillaService.findPlantilla(aerolineaId);
        if (!plantilla) {
            return [];
        }
        return this.aerolineaPlantillaService.findConceptosByPlantilla(plantilla.idAerolinea);
    }

    async updateConcepto(conceptoId: number, updateConceptoCostoDto: UpdateConceptoCostoDto): Promise<ConceptoCostoEntity> {
        // Find the concepto to get the plantilla ID
        const concepto = await this.prisma.conceptoCosto.findUnique({
            where: { id: conceptoId },
            include: { plantilla: true },
        });

        if (!concepto) {
            throw new NotFoundException(`ConceptoCosto with ID ${conceptoId} not found`);
        }

        return this.aerolineaPlantillaService.updateConcepto(concepto.plantillaId, conceptoId, updateConceptoCostoDto);
    }

    async removeConcepto(conceptoId: number): Promise<void> {
        // Find the concepto to get the plantilla ID
        const concepto = await this.prisma.conceptoCosto.findUnique({
            where: { id: conceptoId },
            include: { plantilla: true },
        });

        if (!concepto) {
            throw new NotFoundException(`ConceptoCosto with ID ${conceptoId} not found`);
        }

        return this.aerolineaPlantillaService.removeConcepto(concepto.plantillaId, conceptoId);
    }

    // ===== PRIVATE METHODS =====

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