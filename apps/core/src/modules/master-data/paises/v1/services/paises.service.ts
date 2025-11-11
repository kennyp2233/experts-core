import {
    Injectable,
    Inject,
    NotFoundException,
    InternalServerErrorException,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreatePaisDto, UpdatePaisDto } from '../dto';

@Injectable()
export class PaisesService {
    private readonly logger = new Logger(PaisesService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(createPaisDto: CreatePaisDto) {
        try {
            this.logger.log(`Intentando crear país: ${JSON.stringify(createPaisDto)}`);

            if (!createPaisDto.nombre || createPaisDto.nombre.trim() === '') {
                throw new BadRequestException('El nombre del país es requerido');
            }

            if (!createPaisDto.siglasPais || createPaisDto.siglasPais.trim() === '') {
                throw new BadRequestException('Las siglas del país son requeridas');
            }

            // Verificar que las siglas no estén duplicadas
            const existingPais = await this.prisma.pais.findUnique({
                where: { siglasPais: createPaisDto.siglasPais.trim() },
            });

            if (existingPais) {
                throw new BadRequestException(
                    `Ya existe un país con las siglas ${createPaisDto.siglasPais}`,
                );
            }

            // Verificar que el acuerdo arancelario existe si se proporciona
            if (createPaisDto.idAcuerdo) {
                const acuerdo = await this.prisma.acuerdoArancelario.findUnique({
                    where: { idAcuerdo: createPaisDto.idAcuerdo },
                });

                if (!acuerdo) {
                    throw new BadRequestException(
                        `No existe un acuerdo arancelario con ID ${createPaisDto.idAcuerdo}`,
                    );
                }
            }

            const pais = await this.prisma.pais.create({
                data: {
                    siglasPais: createPaisDto.siglasPais.trim(),
                    nombre: createPaisDto.nombre.trim(),
                    paisId: createPaisDto.paisId,
                    idAcuerdo: createPaisDto.idAcuerdo,
                    estado: createPaisDto.estado ?? true,
                },
            });

            this.logger.log(`País creado exitosamente: ${pais.idPais} - ${pais.nombre}`);

            return pais;
        } catch (error) {
            this.logger.error(`Error al crear país: ${error.message}`, error.stack);

            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Error al crear país');
        }
    }

    async findAll(skip?: number, take?: number) {
        try {
            const [paises, total] = await Promise.all([
                this.prisma.pais.findMany({
                    skip,
                    take,
                    include: {
                        acuerdo: true,
                    },
                    orderBy: {
                        nombre: 'asc',
                    },
                }),
                this.prisma.pais.count(),
            ]);

            return {
                data: paises,
                total,
                skip: skip || 0,
                take: take || total,
            };
        } catch (error) {
            this.logger.error(`Error al obtener países: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Error al obtener países');
        }
    }

    async findOne(id: number) {
        try {
            const pais = await this.prisma.pais.findUnique({
                where: { idPais: id },
                include: {
                    acuerdo: true,
                },
            });

            if (!pais) {
                throw new NotFoundException(`País con ID ${id} no encontrado`);
            }

            return pais;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error al obtener país: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Error al obtener país');
        }
    }

    async update(id: number, updatePaisDto: UpdatePaisDto) {
        try {
            const pais = await this.prisma.pais.findUnique({
                where: { idPais: id },
            });

            if (!pais) {
                throw new NotFoundException(`País con ID ${id} no encontrado`);
            }

            // Verificar siglas duplicadas si se está actualizando
            if (updatePaisDto.siglasPais) {
                const existingPais = await this.prisma.pais.findUnique({
                    where: { siglasPais: updatePaisDto.siglasPais.trim() },
                });

                if (existingPais && existingPais.idPais !== id) {
                    throw new BadRequestException(
                        `Ya existe un país con las siglas ${updatePaisDto.siglasPais}`,
                    );
                }
            }

            // Verificar que el acuerdo arancelario existe si se proporciona
            if (updatePaisDto.idAcuerdo) {
                const acuerdo = await this.prisma.acuerdoArancelario.findUnique({
                    where: { idAcuerdo: updatePaisDto.idAcuerdo },
                });

                if (!acuerdo) {
                    throw new BadRequestException(
                        `No existe un acuerdo arancelario con ID ${updatePaisDto.idAcuerdo}`,
                    );
                }
            }

            const updateData: any = {};

            if (updatePaisDto.siglasPais !== undefined) {
                updateData.siglasPais = updatePaisDto.siglasPais.trim();
            }
            if (updatePaisDto.nombre !== undefined) {
                updateData.nombre = updatePaisDto.nombre.trim();
            }
            if (updatePaisDto.paisId !== undefined) {
                updateData.paisId = updatePaisDto.paisId;
            }
            if (updatePaisDto.idAcuerdo !== undefined) {
                updateData.idAcuerdo = updatePaisDto.idAcuerdo;
            }
            if (updatePaisDto.estado !== undefined) {
                updateData.estado = updatePaisDto.estado;
            }

            const updatedPais = await this.prisma.pais.update({
                where: { idPais: id },
                data: updateData,
                include: {
                    acuerdo: true,
                },
            });

            this.logger.log(`País actualizado: ${id} - ${updatedPais.nombre}`);

            return updatedPais;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Error al actualizar país: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Error al actualizar país');
        }
    }

    async remove(id: number) {
        try {
            const pais = await this.prisma.pais.findUnique({
                where: { idPais: id },
            });

            if (!pais) {
                throw new NotFoundException(`País con ID ${id} no encontrado`);
            }

            await this.prisma.pais.delete({
                where: { idPais: id },
            });

            this.logger.log(`País eliminado: ${id} - ${pais.nombre}`);

            return {
                message: `País ${pais.nombre} eliminado exitosamente`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error al eliminar país: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Error al eliminar país');
        }
    }

    async findByName(nombre: string) {
        try {
            const paises = await this.prisma.pais.findMany({
                where: {
                    nombre: {
                        contains: nombre,
                        mode: 'insensitive',
                    },
                },
                include: {
                    acuerdo: true,
                },
            });

            return paises;
        } catch (error) {
            this.logger.error(`Error al buscar países: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Error al buscar países');
        }
    }

    async findBySiglas(siglas: string) {
        try {
            const pais = await this.prisma.pais.findUnique({
                where: { siglasPais: siglas },
                include: {
                    acuerdo: true,
                },
            });

            return pais;
        } catch (error) {
            this.logger.error(`Error al buscar país por siglas: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Error al buscar país por siglas');
        }
    }
}