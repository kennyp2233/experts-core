import { Module } from '@nestjs/common';
import { DestinoController } from './v1/destino.controller';
import { DestinoService } from './v1/destino.service';

@Module({
  providers: [
    DestinoService,
      ],
  controllers: [DestinoController],
  exports: [DestinoService],
})
export class DestinoModule {}

