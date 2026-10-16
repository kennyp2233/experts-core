import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { LegacyDbModule } from '../../integrations/legacy-db/legacy-db.module';
import { LegacySyncController } from './legacy-sync.controller';
import { LegacySyncService } from './legacy-sync.service';
import { LEGACY_SYNC_QUEUE, LegacySyncProcessor } from './workers/legacy-sync.processor';

/**
 * Sync Access → PG del sistema viejo (datos maestros y documentos). Ver
 * README.md de esta carpeta. Usa los clientes globales de DatabaseModule
 * (datos maestros y documentos).
 */
@Module({
  imports: [
    LegacyDbModule,
    HttpModule,
    BullModule.registerQueue({ name: LEGACY_SYNC_QUEUE }),
  ],
  controllers: [LegacySyncController],
  providers: [
    LegacySyncService,
    LegacySyncProcessor,
  ],
  exports: [LegacySyncService],
})
export class LegacySyncModule {}
