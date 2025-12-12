import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@internal/documentos-client';

@Injectable()
export class DocumentoBaseService {
    constructor(
        @Inject('PrismaClientDocumentos') private readonly prisma: PrismaClient
    ) { }

    async findOne(id: number) {
        const doc = await this.prisma.documentoBase.findUnique({
            where: { id },
        });
        if (!doc) throw new NotFoundException(`DocumentoBase ${id} not found`);
        return doc;
    }

    async create(data: any, tx?: PrismaClient) {
        const client = tx || this.prisma;
        return client.documentoBase.create({
            data,
        });
    }
}

