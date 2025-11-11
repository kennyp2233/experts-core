import { Module } from '@nestjs/common';
import { SubAgenciaController } from './sub-agencia.controller';
import { SubAgenciaService } from './services/sub-agencia.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [SubAgenciaController],
  providers: [
    SubAgenciaService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [SubAgenciaService],
})
export class SubAgenciaModule {}