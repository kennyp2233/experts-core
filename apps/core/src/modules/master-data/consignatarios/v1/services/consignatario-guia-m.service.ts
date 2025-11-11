import {
    Injectable,
    Inject,
    Logger,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateConsignatarioGuiaMDto } from '../dto/create-consignatario.dto';

@Injectable()
export class ConsignatarioGuiaMService {
    private readonly logger = new Logger(ConsignatarioGuiaMService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(idConsignatario: number, dto: CreateConsignatarioGuiaMDto) {
        try {
            // Verificar que el destino existe si se proporciona
            if (dto.idDestino !== undefined && dto.idDestino !== null) {
                const destino = await this.prisma.destino.findUnique({
                    where: { id: dto.idDestino },
                });

                if (!destino) {
                    throw new BadRequestException(
                        `No existe un destino con ID ${dto.idDestino}`,
                    );
                }
            }

            return await this.prisma.consignatarioGuiaM.upsert({
                where: { idConsignatario },
                update: this.buildUpdateData(dto),
                create: {
                    idConsignatario,
                    ...dto,
                },
            });
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(
                `Error al crear Guía M: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al crear Guía M');
        }
    }

    async update(idConsignatario: number, dto: CreateConsignatarioGuiaMDto) {
        try {
            // Verificar que el destino existe si se proporciona
            if (dto.idDestino !== undefined && dto.idDestino !== null) {
                const destino = await this.prisma.destino.findUnique({
                    where: { id: dto.idDestino },
                });

                if (!destino) {
                    throw new BadRequestException(
                        `No existe un destino con ID ${dto.idDestino}`,
                    );
                }
            }

            return await this.prisma.consignatarioGuiaM.upsert({
                where: { idConsignatario },
                update: this.buildUpdateData(dto),
                create: {
                    idConsignatario,
                    ...dto,
                },
            });
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(
                `Error al actualizar Guía M: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al actualizar Guía M');
        }
    }

    private buildUpdateData(dto: any): any {
        const updateData: any = {};
        Object.keys(dto).forEach((key) => {
            if (dto[key] !== undefined) {
                updateData[key] = typeof dto[key] === 'string' ? dto[key]?.trim() : dto[key];
            }
        });
        return updateData;
    }
}