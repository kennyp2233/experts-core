import { Module } from '@nestjs/common';
import { BodegueroController } from './v1/bodeguero.controller';
import { BodegueroService } from './v1/services/bodeguero.service';

@Module({
  controllers: [BodegueroController],
  providers: [
    BodegueroService,
      ],
  exports: [BodegueroService],
})
export class BodegueroModule {}
