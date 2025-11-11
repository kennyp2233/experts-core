import { Module } from '@nestjs/common';
import { MedidasController } from './v1/medidas.controller';
import { MedidasService } from './v1/services/medidas.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [MedidasController],
  providers: [
    MedidasService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [MedidasService],
})
export class MedidasModule {}