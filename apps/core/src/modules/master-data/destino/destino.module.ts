import { Module } from '@nestjs/common';
import { DestinoController } from './v1/destino.controller';
import { DestinoService } from './v1/destino.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  providers: [
    DestinoService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  controllers: [DestinoController],
  exports: [DestinoService],
})
export class DestinoModule {}
