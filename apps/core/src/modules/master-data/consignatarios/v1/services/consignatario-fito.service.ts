import {
    Injectable,
    Inject,
    Logger,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateConsignatarioFitoDto } from '../dto/create-consignatario.dto';

@Injectable()
export class ConsignatarioFitoService {
    private readonly logger = new Logger(ConsignatarioFitoService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(idConsignatario: number, dto: CreateConsignatarioFitoDto) {
        try {
            return await this.prisma.consignatarioFito.upsert({
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
                `Error al crear FITO: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al crear FITO');
        }
    }

    async update(idConsignatario: number, dto: CreateConsignatarioFitoDto) {
        try {
            return await this.prisma.consignatarioFito.upsert({
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
                `Error al actualizar FITO: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al actualizar FITO');
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