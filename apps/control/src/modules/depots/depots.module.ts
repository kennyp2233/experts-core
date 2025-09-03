import { Module } from '@nestjs/common';
import { DepotsController } from './depots.controller';
import { DepotsService } from './depots.service';
import { DepotCrudService } from './services/depot-crud.service';
import { DepotStatsService } from './services/depot-stats.service';
import { DepotSecretService } from './services/depot-secret.service';
import { PrismaService } from '../../prisma.service';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [WorkersModule],
  controllers: [DepotsController],
  providers: [
    DepotsService,
    DepotCrudService,
    DepotStatsService,
    DepotSecretService,
    PrismaService
  ],
  exports: [DepotsService, DepotCrudService, DepotStatsService],
})
export class DepotsModule {}
