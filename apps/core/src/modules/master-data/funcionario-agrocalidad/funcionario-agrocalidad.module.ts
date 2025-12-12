import { Module } from '@nestjs/common';
import { FuncionarioAgrocalidadController } from './v1/funcionario-agrocalidad.controller';
import { FuncionarioAgrocalidadService } from './v1/services/funcionario-agrocalidad.service';

@Module({
  controllers: [FuncionarioAgrocalidadController],
  providers: [
    FuncionarioAgrocalidadService,
      ],
  exports: [FuncionarioAgrocalidadService],
})
export class FuncionarioAgrocalidadModule {}
