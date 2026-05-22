import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LegacyDbModule } from '../../integrations/legacy-db/legacy-db.module';
import { EbfPortalModule } from '../../integrations/ebf-portal/ebf-portal.module';
import { EbfAccessSyncService } from './ebf-access-sync.service';
import { EbfAccessSyncController } from './ebf-access-sync.controller';
import { AccessPullerService } from './services/access-puller.service';
import { EbfPullerService } from './services/ebf-puller.service';
import { MatcherService } from './services/matcher.service';
import {
  EBF_SYNC_QUEUE,
  EbfAccessSyncProcessor,
} from './workers/ebf-access-sync.processor';
import { PrismaEbfPortalSyncProvider } from './prisma/prisma-ebf-portal-sync.provider';

/**
 * Sync hub Access ↔ EBF (Fase 1, read-only). Ver
 * `integrations/ebf-portal/ACCESS_EBF_SYNC.md` para arquitectura completa.
 *
 * Depende de:
 *  - LegacyDbModule (queries a Access vía bridge)
 *  - EbfPortalModule (consume manager view del portal)
 *  - BullModule (cron del ciclo)
 *  - PrismaClient ebf_portal_sync (provider local)
 */
@Module({
  imports: [
    LegacyDbModule,
    EbfPortalModule,
    BullModule.registerQueue({ name: EBF_SYNC_QUEUE }),
  ],
  controllers: [EbfAccessSyncController],
  providers: [
    PrismaEbfPortalSyncProvider,
    AccessPullerService,
    EbfPullerService,
    MatcherService,
    EbfAccessSyncService,
    EbfAccessSyncProcessor,
  ],
  exports: [EbfAccessSyncService],
})
export class EbfAccessSyncModule {}
