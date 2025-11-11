import { Module } from '@nestjs/common';
import { FuncionarioAgrocalidadController } from './v1/funcionario-agrocalidad.controller';
import { FuncionarioAgrocalidadService } from './v1/services/funcionario-agrocalidad.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [FuncionarioAgrocalidadController],
  providers: [
    FuncionarioAgrocalidadService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [FuncionarioAgrocalidadService],
})
export class FuncionarioAgrocalidadModule {}