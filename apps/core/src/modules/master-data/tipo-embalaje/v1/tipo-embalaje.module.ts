import { Module } from '@nestjs/common';
import { TipoEmbalajeController } from './tipo-embalaje.controller';
import { TipoEmbalajeService } from './services/tipo-embalaje.service';

@Module({
  controllers: [TipoEmbalajeController],
  providers: [
    TipoEmbalajeService,
      ],
  exports: [TipoEmbalajeService],
})
export class TipoEmbalajeModule {}
