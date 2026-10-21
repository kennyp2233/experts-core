import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EbfPortalModule } from '../../integrations/ebf-portal/ebf-portal.module';
import { PrismaEbfPortalSyncProvider } from '../../sync/ebf-access/prisma/prisma-ebf-portal-sync.provider';
import { CoordinacionesEbfRepo } from './coordinaciones-ebf.repo';
import { EnvioEbfController } from './envio-ebf.controller';
import { ENVIO_EBF_QUEUE, EnvioEbfProcessor } from './envio-ebf.processor';
import { EnvioEbfService } from './envio-ebf.service';
import { EquivalenciasEbfService } from './equivalencias-ebf.service';
import { LecturaEbfService } from './lectura-ebf.service';

/**
 * Coordinaciones del sistema nuevo frente a EBF (ADR 0004): equivalencias con
 * el portal, conciliación por guía hija, cola visible y envío.
 */
@Module({
  imports: [EbfPortalModule, BullModule.registerQueue({ name: ENVIO_EBF_QUEUE })],
  controllers: [EnvioEbfController],
  providers: [
    PrismaEbfPortalSyncProvider,
    CoordinacionesEbfRepo,
    LecturaEbfService,
    EquivalenciasEbfService,
    EnvioEbfService,
    EnvioEbfProcessor,
  ],
})
export class EnvioEbfModule {}
