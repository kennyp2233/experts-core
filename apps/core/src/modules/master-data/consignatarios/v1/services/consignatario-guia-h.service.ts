import {
    Injectable,
    Inject,
    Logger,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateConsignatarioGuiaHDto } from '../dto/create-consignatario.dto';

@Injectable()
export class ConsignatarioGuiaHService {
    private readonly logger = new Logger(ConsignatarioGuiaHService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(idConsignatario: number, dto: CreateConsignatarioGuiaHDto) {
        try {
            return await this.prisma.consignatarioGuiaH.upsert({
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
                `Error al crear Guía H: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al crear Guía H');
        }
    }

    async update(idConsignatario: number, dto: CreateConsignatarioGuiaHDto) {
        try {
            return await this.prisma.consignatarioGuiaH.upsert({
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
                `Error al actualizar Guía H: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al actualizar Guía H');
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