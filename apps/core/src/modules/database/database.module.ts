import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaClient as PrismaClientProductos } from '@internal/datos-maestros-client';
import { PrismaClient as PrismaClientUsuarios } from '@internal/usuarios-client';
import { PrismaClient as PrismaClientTemplates } from '@internal/templates-client';
import { PrismaClient as PrismaClientDocumentos } from '@internal/documentos-client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Cliente del schema `documentos` con el schema bien fijado (search_path).
 * Lo usan el sync con Access y el módulo de operación. (El viejo
 * `DocumentoBaseModule` crea su propio cliente con otro token.)
 */
export const PRISMA_DOCUMENTOS = 'PrismaClientDocumentosDb';

/**
 * Extracts schema name from connection string (e.g., ?schema=usuarios)
 */
const extractSchema = (connectionString: string): string | null => {
    const match = connectionString.match(/[?&]schema=([^&]+)/);
    return match ? match[1] : null;
};

/**
 * Removes schema parameter from connection string
 */
const removeSchemaParam = (connectionString: string): string => {
    return connectionString
        .replace(/\?schema=[^&]+&?/, '?')
        .replace(/&schema=[^&]+/, '')
        .replace(/\?$/, '');
};

/**
 * Creates a Prisma client factory for a given database URL environment variable.
 * Handles the schema parameter by setting the search_path via PostgreSQL options.
 */
export const createPrismaFactory = <T>(
    envKey: string,
    ClientClass: new (options: { adapter: PrismaPg }) => T,
) => {
    return {
        useFactory: async (configService: ConfigService) => {
            const connectionString = configService.get<string>(envKey) || '';
            const schema = extractSchema(connectionString);
            const cleanConnectionString = removeSchemaParam(connectionString);

            // Configure pool with schema in options
            const poolConfig: any = { connectionString: cleanConnectionString };

            if (schema) {
                // Use PostgreSQL options to set search_path
                poolConfig.options = `-c search_path=${schema}`;
            }

            const pool = new Pool(poolConfig);
            const adapter = new PrismaPg(pool, { schema: schema || undefined });
            return new ClientClass({ adapter });
        },
        inject: [ConfigService],
    };
};

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'PrismaClientDatosMaestros',
            ...createPrismaFactory('DATABASE_URL_DATOS_MAESTROS', PrismaClientProductos),
        },
        {
            provide: 'PrismaClientUsuarios',
            ...createPrismaFactory('DATABASE_URL_USUARIOS', PrismaClientUsuarios),
        },
        {
            provide: 'PrismaClientTemplates',
            ...createPrismaFactory('DATABASE_URL_TEMPLATES', PrismaClientTemplates),
        },
        {
            provide: PRISMA_DOCUMENTOS,
            ...createPrismaFactory('DATABASE_URL_DOCUMENTOS', PrismaClientDocumentos),
        },
    ],
    exports: [
        'PrismaClientDatosMaestros',
        'PrismaClientUsuarios',
        'PrismaClientTemplates',
        PRISMA_DOCUMENTOS,
    ],
})
export class DatabaseModule { }
