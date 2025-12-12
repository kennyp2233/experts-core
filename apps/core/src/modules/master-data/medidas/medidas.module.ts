import { Module } from '@nestjs/common';
import { MedidasController } from './v1/medidas.controller';
import { MedidasService } from './v1/services/medidas.service';

@Module({
  controllers: [MedidasController],
  providers: [
    MedidasService,
      ],
  exports: [MedidasService],
})
export class MedidasModule {}
