import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EbfHttpClient } from './http/ebf-http.client';
import { EbfCustomerHttpClient } from './http/ebf-customer-http.client';
import { EbfAuthService } from './auth/ebf-auth.service';
import { EbfCustomerAuthService } from './auth/ebf-customer-auth.service';
import { EbfCoordinacionService } from './services/coordinacion.service';
import { EbfCoordinacionSelectionService } from './services/coordinacion-selection.service';
import { EbfCoordinacionCreateService } from './services/coordinacion-create.service';
import { EbfDaeService } from './services/dae.service';
import { EbfCustomerAwbService } from './services/customer-awb.service';
import { EbfPortalService } from './ebf-portal.service';
import { EbfPortalController } from './ebf-portal.controller';
import { EbfCustomerController } from './ebf-customer.controller';
import ebfPortalConfig from './config/ebf-portal.config';

@Module({
  imports: [ConfigModule.forFeature(ebfPortalConfig)],
  controllers: [EbfPortalController, EbfCustomerController],
  providers: [
    EbfHttpClient,
    EbfCustomerHttpClient,
    EbfAuthService,
    EbfCustomerAuthService,
    EbfCoordinacionService,
    EbfCoordinacionSelectionService,
    EbfCoordinacionCreateService,
    EbfDaeService,
    EbfCustomerAwbService,
    EbfPortalService,
  ],
  exports: [EbfPortalService],
})
export class EbfPortalModule {}
