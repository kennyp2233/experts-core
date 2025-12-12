import { Module } from '@nestjs/common';
import { ClientesController } from './v1/clientes.controller';
import { ClientesService } from './v1/clientes.service';

@Module({
  providers: [
    ClientesService,
      ],
  controllers: [ClientesController],
  exports: [ClientesService],
})
export class ClientesModule {}
