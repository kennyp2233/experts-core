import { Module } from '@nestjs/common';
import { CaeAduanaController } from './v1/cae-aduana.controller';
import { CaeAduanaService } from './v1/cae-aduana.service';

@Module({
  providers: [
    CaeAduanaService,
      ],
  controllers: [CaeAduanaController],
  exports: [CaeAduanaService],
})
export class CaeAduanaModule {}

