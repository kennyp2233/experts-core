import { Module } from '@nestjs/common';
import { OrigenController } from './v1/origen.controller';
import { OrigenService } from './v1/origen.service';

@Module({
  providers: [
    OrigenService,
      ],
  controllers: [OrigenController],
  exports: [OrigenService],
})
export class OrigenModule {}

