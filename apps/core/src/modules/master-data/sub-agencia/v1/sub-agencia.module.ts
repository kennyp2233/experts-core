import { Module } from '@nestjs/common';
import { SubAgenciaController } from './sub-agencia.controller';
import { SubAgenciaService } from './services/sub-agencia.service';

@Module({
  controllers: [SubAgenciaController],
  providers: [
    SubAgenciaService,
      ],
  exports: [SubAgenciaService],
})
export class SubAgenciaModule {}
