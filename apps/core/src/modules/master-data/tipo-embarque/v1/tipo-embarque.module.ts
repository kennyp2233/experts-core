import { Module } from '@nestjs/common';
import { TipoEmbarqueController } from './tipo-embarque.controller';
import { TipoEmbarqueService } from './services/tipo-embarque.service';

@Module({
  controllers: [TipoEmbarqueController],
  providers: [
    TipoEmbarqueService,
      ],
  exports: [TipoEmbarqueService],
})
export class TipoEmbarqueModule { }
