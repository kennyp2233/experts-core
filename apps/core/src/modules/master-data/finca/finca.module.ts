import { Module } from '@nestjs/common';
import { FincaController } from './v1/finca.controller';
import { FincaService } from './v1/services/finca.service';
import { FincaRelacionesService } from './v1/services/finca-relaciones.service';
import { FincaChoferService } from './v1/services/finca-chofer.service';
import { FincaProductoService } from './v1/services/finca-producto.service';

@Module({
  controllers: [FincaController],
  providers: [
    FincaService,
    FincaRelacionesService,
    FincaChoferService,
    FincaProductoService,
      ],
  exports: [FincaService],
})
export class FincaModule {}
