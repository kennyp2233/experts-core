import { Module } from '@nestjs/common';
import { PaisesController } from './v1/paises.controller';
import { PaisesService } from './v1/services/paises.service';

@Module({
  controllers: [PaisesController],
  providers: [
    PaisesService,
      ],
  exports: [PaisesService],
})
export class PaisesModule {}
