import { Module } from '@nestjs/common';
import { AgenciaIataController } from './agencia-iata.controller';
import { AgenciaIataService } from './services/agencia-iata.service';

@Module({
  controllers: [AgenciaIataController],
  providers: [
    AgenciaIataService,
      ],
  exports: [AgenciaIataService],
})
export class AgenciaIataModule {}
