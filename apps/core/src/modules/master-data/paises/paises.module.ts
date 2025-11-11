import { Module } from '@nestjs/common';
import { PaisesController } from './v1/paises.controller';
import { PaisesService } from './v1/services/paises.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [PaisesController],
  providers: [
    PaisesService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [PaisesService],
})
export class PaisesModule {}