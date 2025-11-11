import {
    Injectable,
    Inject,
    Logger,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateConsignatarioFacturacionDto } from '../dto/create-consignatario.dto';

@Injectable()
export class ConsignatarioFacturacionService {
    private readonly logger = new Logger(ConsignatarioFacturacionService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(idConsignatario: number, dto: CreateConsignatarioFacturacionDto) {
        try {
            return await this.prisma.consignatarioFacturacion.upsert({
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
                `Error al crear facturación: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al crear facturación');
        }
    }

    async update(idConsignatario: number, dto: CreateConsignatarioFacturacionDto) {
        try {
            return await this.prisma.consignatarioFacturacion.upsert({
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
                `Error al actualizar facturación: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al actualizar facturación');
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