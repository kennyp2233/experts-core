import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '.prisma/documentos-client';

@Injectable()
export class GuiaMadreRepository {
    constructor(
        @Inject('PrismaClientDocumentos') private readonly prisma: PrismaClient
    ) { }

    async findById(id: number) {
        return this.prisma.guiaMadre.findUnique({
            where: { id },
            include: {
                documentoBase: true,
                documentoCoordinacion: true,
            },
        });
    }

    async findAll(params: {
        where?: any,
        skip?: number,
        take?: number,
        orderBy?: any
    }) {
        const { where = {}, skip, take, orderBy = [{ prefijo: 'asc' }, { secuencial: 'asc' }] } = params;

        return this.prisma.guiaMadre.findMany({
            where,
            skip,
            take,
            include: {
                documentoBase: true,
                documentoCoordinacion: true,
            },
            orderBy,
        });
    }

    async count(where: any) {
        return this.prisma.guiaMadre.count({ where });
    }

    async create(data: any) {
        return this.prisma.guiaMadre.create({
            data,
            include: {
                documentoBase: true,
            },
        });
    }

    async update(id: number, data: any) {
        return this.prisma.guiaMadre.update({
            where: { id },
            data,
            include: {
                documentoBase: true,
            },
        });
    }

    async findDisponibles(aerolineaId?: number) {
        const where: any = {
            documentoCoordinacion: null, // Not assigned to a coordination
            prestada: false,             // Not borrowed
            devolucion: false,           // Not returned
        };

        if (aerolineaId) {
            where.documentoBase = {
                idAerolinea: aerolineaId,
            };
        }

        return this.findAll({ where });
    }

    // Proxy to prisma.$transaction for service use
    async runTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
