import { Module } from '@nestjs/common';
import { AcuerdosArancelariosController } from './v1/acuerdos-arancelarios.controller';
import { AcuerdosArancelariosService } from './v1/services/acuerdos-arancelarios.service';

@Module({
  controllers: [AcuerdosArancelariosController],
  providers: [
    AcuerdosArancelariosService,
      ],
  exports: [AcuerdosArancelariosService],
})
export class AcuerdosArancelariosModule {}
