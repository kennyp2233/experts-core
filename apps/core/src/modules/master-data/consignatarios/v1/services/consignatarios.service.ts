import {
    Injectable,
    Inject,
    NotFoundException,
    InternalServerErrorException,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateConsignatarioDto, UpdateConsignatarioDto } from '../dto';
import { ConsignatarioCaeSiceService } from './consignatario-cae-sice.service';
import { ConsignatarioFacturacionService } from './consignatario-facturacion.service';
import { ConsignatarioFitoService } from './consignatario-fito.service';
import { ConsignatarioGuiaHService } from './consignatario-guia-h.service';
import { ConsignatarioGuiaMService } from './consignatario-guia-m.service';
import { ConsignatarioTransmisionService } from './consignatario-transmision.service';

@Injectable()
export class ConsignatariosService {
    private readonly logger = new Logger(ConsignatariosService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
        private caeSiceService: ConsignatarioCaeSiceService,
        private facturacionService: ConsignatarioFacturacionService,
        private fitoService: ConsignatarioFitoService,
        private guiaHService: ConsignatarioGuiaHService,
        private guiaMService: ConsignatarioGuiaMService,
        private transmisionService: ConsignatarioTransmisionService,
    ) { }

    async create(createConsignatarioDto: CreateConsignatarioDto) {
        try {
            if (
                !createConsignatarioDto.nombre ||
                createConsignatarioDto.nombre.trim() === ''
            ) {
                throw new BadRequestException(
                    'El nombre del consignatario es requerido',
                );
            }

            // Verificar que el embarcador existe
            const embarcador = await this.prisma.embarcador.findUnique({
                where: { id: createConsignatarioDto.idEmbarcador },
            });

            if (!embarcador) {
                throw new BadRequestException(
                    `No existe un embarcador con ID ${createConsignatarioDto.idEmbarcador}`,
                );
            }

            // Verificar que el cliente existe
            const cliente = await this.prisma.cliente.findUnique({
                where: { id: createConsignatarioDto.idCliente },
            });

            if (!cliente) {
                throw new BadRequestException(
                    `No existe un cliente con ID ${createConsignatarioDto.idCliente}`,
                );
            }

            // Crear consignatario principal
            const consignatario = await this.prisma.consignatario.create({
                data: {
                    nombre: createConsignatarioDto.nombre.trim(),
                    ruc: createConsignatarioDto.ruc?.trim(),
                    direccion: createConsignatarioDto.direccion?.trim(),
                    idEmbarcador: createConsignatarioDto.idEmbarcador,
                    idCliente: createConsignatarioDto.idCliente,
                    telefono: createConsignatarioDto.telefono?.trim(),
                    email: createConsignatarioDto.email?.trim(),
                    ciudad: createConsignatarioDto.ciudad?.trim(),
                    pais: createConsignatarioDto.pais?.trim(),
                    estado: createConsignatarioDto.estado ?? true,
                },
            });

            // Crear registros asociados si se proporcionan
            if (createConsignatarioDto.caeSice) {
                await this.caeSiceService.create(consignatario.id, createConsignatarioDto.caeSice);
            }

            if (createConsignatarioDto.facturacion) {
                await this.facturacionService.create(
                    consignatario.id,
                    createConsignatarioDto.facturacion,
                );
            }

            if (createConsignatarioDto.fito) {
                await this.fitoService.create(consignatario.id, createConsignatarioDto.fito);
            }

            if (createConsignatarioDto.guiaH) {
                await this.guiaHService.create(consignatario.id, createConsignatarioDto.guiaH);
            }

            if (createConsignatarioDto.guiaM) {
                await this.guiaMService.create(consignatario.id, createConsignatarioDto.guiaM);
            }

            if (createConsignatarioDto.transmision) {
                await this.transmisionService.create(
                    consignatario.id,
                    createConsignatarioDto.transmision,
                );
            }

            this.logger.log(
                `Consignatario creado: ${consignatario.id} - ${consignatario.nombre}`,
            );

            return await this.findOne(consignatario.id);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(
                `Error al crear consignatario: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al crear consignatario');
        }
    }

    async findAll(skip?: number, take?: number, sortField?: string, sortOrder?: string) {
        try {
            // Configurar ordenamiento por defecto
            let orderBy: any = {
                nombre: 'asc',
            };

            // Aplicar ordenamiento personalizado si se proporciona
            if (sortField && sortOrder) {
                orderBy = {
                    [sortField]: sortOrder,
                };
            }

            const [consignatarios, total] = await Promise.all([
                this.prisma.consignatario.findMany({
                    skip,
                    take,
                    include: {
                        embarcador: true,
                        cliente: true,
                        caeSice: true,
                        facturacion: true,
                        fito: true,
                        guiaH: true,
                        guiaM: {
                            include: {
                                destino: true,
                            },
                        },
                        transmision: true,
                    },
                    orderBy,
                }),
                this.prisma.consignatario.count(),
            ]);

            return {
                data: consignatarios,
                total,
                skip: skip || 0,
                take: take || total,
            };
        } catch (error) {
            this.logger.error(
                `Error al obtener consignatarios: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Error al obtener consignatarios',
            );
        }
    }

    async findOne(id: number) {
        try {
            const consignatario = await this.prisma.consignatario.findUnique({
                where: { id },
                include: {
                    embarcador: true,
                    cliente: true,
                    caeSice: true,
                    facturacion: true,
                    fito: true,
                    guiaH: true,
                    guiaM: {
                        include: {
                            destino: true,
                        },
                    },
                    transmision: true,
                },
            });

            if (!consignatario) {
                throw new NotFoundException(
                    `Consignatario con ID ${id} no encontrado`,
                );
            }

            return consignatario;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(
                `Error al obtener consignatario: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al obtener consignatario');
        }
    }

    async update(id: number, updateConsignatarioDto: UpdateConsignatarioDto) {
        try {
            const consignatario = await this.prisma.consignatario.findUnique({
                where: { id },
            });

            if (!consignatario) {
                throw new NotFoundException(
                    `Consignatario con ID ${id} no encontrado`,
                );
            }

            // Verificar que el embarcador existe si se proporciona
            if (updateConsignatarioDto.idEmbarcador !== undefined) {
                const embarcador = await this.prisma.embarcador.findUnique({
                    where: { id: updateConsignatarioDto.idEmbarcador },
                });

                if (!embarcador) {
                    throw new BadRequestException(
                        `No existe un embarcador con ID ${updateConsignatarioDto.idEmbarcador}`,
                    );
                }
            }

            // Verificar que el cliente existe si se proporciona
            if (updateConsignatarioDto.idCliente !== undefined) {
                const cliente = await this.prisma.cliente.findUnique({
                    where: { id: updateConsignatarioDto.idCliente },
                });

                if (!cliente) {
                    throw new BadRequestException(
                        `No existe un cliente con ID ${updateConsignatarioDto.idCliente}`,
                    );
                }
            }

            const updateData: any = {};

            if (updateConsignatarioDto.nombre !== undefined) {
                updateData.nombre = updateConsignatarioDto.nombre.trim();
            }
            if (updateConsignatarioDto.ruc !== undefined) {
                updateData.ruc = updateConsignatarioDto.ruc?.trim();
            }
            if (updateConsignatarioDto.direccion !== undefined) {
                updateData.direccion = updateConsignatarioDto.direccion?.trim();
            }
            if (updateConsignatarioDto.telefono !== undefined) {
                updateData.telefono = updateConsignatarioDto.telefono?.trim();
            }
            if (updateConsignatarioDto.email !== undefined) {
                updateData.email = updateConsignatarioDto.email?.trim();
            }
            if (updateConsignatarioDto.ciudad !== undefined) {
                updateData.ciudad = updateConsignatarioDto.ciudad?.trim();
            }
            if (updateConsignatarioDto.pais !== undefined) {
                updateData.pais = updateConsignatarioDto.pais?.trim();
            }
            if (updateConsignatarioDto.estado !== undefined) {
                updateData.estado = updateConsignatarioDto.estado;
            }

            const updatedConsignatario = await this.prisma.consignatario.update({
                where: { id },
                data: updateData,
                include: {
                    embarcador: true,
                    cliente: true,
                    caeSice: true,
                    facturacion: true,
                    fito: true,
                    guiaH: true,
                    guiaM: {
                        include: {
                            destino: true,
                        },
                    },
                    transmision: true,
                },
            });

            // Actualizar submodelos si se proporcionan
            if (updateConsignatarioDto.caeSice) {
                await this.caeSiceService.update(id, updateConsignatarioDto.caeSice);
            }

            if (updateConsignatarioDto.facturacion) {
                await this.facturacionService.update(id, updateConsignatarioDto.facturacion);
            }

            if (updateConsignatarioDto.fito) {
                await this.fitoService.update(id, updateConsignatarioDto.fito);
            }

            if (updateConsignatarioDto.guiaH) {
                await this.guiaHService.update(id, updateConsignatarioDto.guiaH);
            }

            if (updateConsignatarioDto.guiaM) {
                await this.guiaMService.update(id, updateConsignatarioDto.guiaM);
            }

            if (updateConsignatarioDto.transmision) {
                await this.transmisionService.update(id, updateConsignatarioDto.transmision);
            }

            this.logger.log(
                `Consignatario actualizado: ${id} - ${updatedConsignatario.nombre}`,
            );

            return await this.findOne(id);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(
                `Error al actualizar consignatario: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Error al actualizar consignatario',
            );
        }
    }

    async remove(id: number) {
        try {
            const consignatario = await this.prisma.consignatario.findUnique({
                where: { id },
            });

            if (!consignatario) {
                throw new NotFoundException(
                    `Consignatario con ID ${id} no encontrado`,
                );
            }

            await this.prisma.consignatario.delete({
                where: { id },
            });

            this.logger.log(
                `Consignatario eliminado: ${id} - ${consignatario.nombre}`,
            );

            return {
                message: `Consignatario ${consignatario.nombre} eliminado exitosamente`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(
                `Error al eliminar consignatario: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Error al eliminar consignatario',
            );
        }
    }

    async findByName(nombre: string) {
        try {
            const consignatarios = await this.prisma.consignatario.findMany({
                where: {
                    nombre: {
                        contains: nombre,
                        mode: 'insensitive',
                    },
                },
                include: {
                    embarcador: true,
                    cliente: true,
                    caeSice: true,
                    facturacion: true,
                    fito: true,
                    guiaH: true,
                    guiaM: {
                        include: {
                            destino: true,
                        },
                    },
                    transmision: true,
                },
            });

            return consignatarios;
        } catch (error) {
            this.logger.error(
                `Error al buscar consignatarios: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al buscar consignatarios');
        }
    }
}