import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { DocumentoBaseService } from './documento-base.service';
import { PrismaClient } from '.prisma/documentos-client';

@Module({
    providers: [
        DocumentoBaseService,
        {
            provide: 'PrismaClientDocumentos',
            useFactory: () => {
                const connectionString = process.env.DATABASE_URL_DOCUMENTOS;
                const pool = new Pool({ connectionString });
                const adapter = new PrismaPg(pool);
                return new PrismaClient({ adapter } as any);
            },
        }
    ],
    exports: [DocumentoBaseService, 'PrismaClientDocumentos'],
})
export class DocumentoBaseModule { }
