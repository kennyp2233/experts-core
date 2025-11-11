import { Module } from '@nestjs/common';
import { AcuerdosArancelariosController } from './v1/acuerdos-arancelarios.controller';
import { AcuerdosArancelariosService } from './v1/services/acuerdos-arancelarios.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [AcuerdosArancelariosController],
  providers: [
    AcuerdosArancelariosService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [AcuerdosArancelariosService],
})
export class AcuerdosArancelariosModule {}