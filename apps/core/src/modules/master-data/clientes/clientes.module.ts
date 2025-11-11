import { Module } from '@nestjs/common';
import { ClientesController } from './v1/clientes.controller';
import { ClientesService } from './v1/clientes.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  providers: [
    ClientesService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  controllers: [ClientesController],
  exports: [ClientesService],
})
export class ClientesModule {}