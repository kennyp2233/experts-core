import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { LegacyDbModule } from '../../integrations/legacy-db/legacy-db.module';
import { createPrismaFactory } from '../../database/database.module';
import { LegacySyncController } from './legacy-sync.controller';
import { LegacySyncService, PRISMA_DOCUMENTOS_SYNC } from './legacy-sync.service';
import { LEGACY_SYNC_QUEUE, LegacySyncProcessor } from './workers/legacy-sync.processor';

/**
 * Sync Access → PG del sistema viejo (datos maestros y documentos). Ver
 * README.md de esta carpeta. Usa el PrismaClientDatosMaestros global y un
 * cliente propio de documentos con el schema bien fijado (search_path).
 */
@Module({
  imports: [
    LegacyDbModule,
    HttpModule,
    BullModule.registerQueue({ name: LEGACY_SYNC_QUEUE }),
  ],
  controllers: [LegacySyncController],
  providers: [
    {
      provide: PRISMA_DOCUMENTOS_SYNC,
      ...createPrismaFactory('DATABASE_URL_DOCUMENTOS', PrismaDocumentos),
    },
    LegacySyncService,
    LegacySyncProcessor,
  ],
  exports: [LegacySyncService],
})
export class LegacySyncModule {}
