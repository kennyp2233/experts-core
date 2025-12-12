import { Module } from '@nestjs/common';
import { ChoferesController } from './v1/choferes.controller';
import { ChoferesService } from './v1/services';

@Module({
  controllers: [ChoferesController],
  providers: [
    ChoferesService,
      ],
  exports: [ChoferesService],
})
export class ChoferesModule {}
