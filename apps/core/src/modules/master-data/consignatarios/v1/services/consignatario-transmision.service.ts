import {
    Injectable,
    Inject,
    Logger,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateConsignatarioTransmisionDto } from '../dto/create-consignatario.dto';

@Injectable()
export class ConsignatarioTransmisionService {
    private readonly logger = new Logger(ConsignatarioTransmisionService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(idConsignatario: number, dto: CreateConsignatarioTransmisionDto) {
        try {
            return await this.prisma.consignatarioTransmision.upsert({
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
                `Error al crear transmisión: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al crear transmisión');
        }
    }

    async update(idConsignatario: number, dto: CreateConsignatarioTransmisionDto) {
        try {
            return await this.prisma.consignatarioTransmision.upsert({
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
                `Error al actualizar transmisión: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al actualizar transmisión');
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