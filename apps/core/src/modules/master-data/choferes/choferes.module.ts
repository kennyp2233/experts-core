import { Module } from '@nestjs/common';
import { ChoferesController } from './v1/choferes.controller';
import { ChoferesService } from './v1/services';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [ChoferesController],
  providers: [
    ChoferesService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [ChoferesService],
})
export class ChoferesModule {}