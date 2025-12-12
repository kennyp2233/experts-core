import { Module } from '@nestjs/common';
import { EmbarcadoresController } from './v1/embarcadores.controller';
import { EmbarcadoresService } from './v1/embarcadores.service';

@Module({
  providers: [
    EmbarcadoresService,
      ],
  controllers: [EmbarcadoresController],
  exports: [EmbarcadoresService],
})
export class EmbarcadoresModule {}

