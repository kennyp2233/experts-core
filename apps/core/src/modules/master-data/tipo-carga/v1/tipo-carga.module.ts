import { Module } from '@nestjs/common';
import { TipoCargaController } from './tipo-carga.controller';
import { TipoCargaService } from './services/tipo-carga.service';

@Module({
  controllers: [TipoCargaController],
  providers: [
    TipoCargaService,
      ],
  exports: [TipoCargaService],
})
export class TipoCargaModule {}
