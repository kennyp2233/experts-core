import { Module } from '@nestjs/common';
import { TipoEmbarqueController } from './tipo-embarque.controller';
import { TipoEmbarqueService } from './services/tipo-embarque.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [TipoEmbarqueController],
  providers: [
    TipoEmbarqueService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [TipoEmbarqueService],
})
export class TipoEmbarqueModule { }