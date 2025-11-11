import { Module } from '@nestjs/common';
import { AgenciaIataController } from './agencia-iata.controller';
import { AgenciaIataService } from './services/agencia-iata.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [AgenciaIataController],
  providers: [
    AgenciaIataService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [AgenciaIataService],
})
export class AgenciaIataModule {}