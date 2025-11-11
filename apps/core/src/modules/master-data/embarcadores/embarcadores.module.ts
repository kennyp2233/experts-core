import { Module } from '@nestjs/common';
import { EmbarcadoresController } from './v1/embarcadores.controller';
import { EmbarcadoresService } from './v1/embarcadores.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  providers: [
    EmbarcadoresService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  controllers: [EmbarcadoresController],
  exports: [EmbarcadoresService],
})
export class EmbarcadoresModule {}
