import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EbfHttpClient } from './http/ebf-http.client';
import { EbfAuthService } from './auth/ebf-auth.service';
import { EbfCoordinacionService } from './services/coordinacion.service';
import { EbfCoordinacionSelectionService } from './services/coordinacion-selection.service';
import { EbfCoordinacionCreateService } from './services/coordinacion-create.service';
import { EbfDaeService } from './services/dae.service';
import { EbfPortalService } from './ebf-portal.service';
import { EbfPortalController } from './ebf-portal.controller';
import ebfPortalConfig from './config/ebf-portal.config';

@Module({
  imports: [ConfigModule.forFeature(ebfPortalConfig)],
  controllers: [EbfPortalController],
  providers: [
    EbfHttpClient,
    EbfAuthService,
    EbfCoordinacionService,
    EbfCoordinacionSelectionService,
    EbfCoordinacionCreateService,
    EbfDaeService,
    EbfPortalService,
  ],
  exports: [EbfPortalService],
})
export class EbfPortalModule {}
