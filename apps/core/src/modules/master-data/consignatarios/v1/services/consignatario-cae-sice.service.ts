import {
    Injectable,
    Inject,
    Logger,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateConsignatarioCaeSiceDto } from '../dto/create-consignatario.dto';

@Injectable()
export class ConsignatarioCaeSiceService {
    private readonly logger = new Logger(ConsignatarioCaeSiceService.name);

    constructor(
        @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    ) { }

    async create(idConsignatario: number, dto: CreateConsignatarioCaeSiceDto) {
        try {
            return await this.prisma.consignatarioCaeSice.upsert({
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
                `Error al crear CAE SICE: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al crear CAE SICE');
        }
    }

    async update(idConsignatario: number, dto: CreateConsignatarioCaeSiceDto) {
        try {
            return await this.prisma.consignatarioCaeSice.upsert({
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
                `Error al actualizar CAE SICE: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException('Error al actualizar CAE SICE');
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