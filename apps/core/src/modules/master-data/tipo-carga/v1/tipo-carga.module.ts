import { Module } from '@nestjs/common';
import { TipoCargaController } from './tipo-carga.controller';
import { TipoCargaService } from './services/tipo-carga.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [TipoCargaController],
  providers: [
    TipoCargaService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [TipoCargaService],
})
export class TipoCargaModule {}