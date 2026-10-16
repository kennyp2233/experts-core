import { Module } from '@nestjs/common';
import { CoordinacionesController } from './coordinaciones/coordinaciones.controller';
import { CoordinacionesService } from './coordinaciones/coordinaciones.service';
import { CoordinarService } from './coordinaciones/coordinar.service';
import { NombresMaestrosService } from './maestros/nombres-maestros.service';
import { GuiasMadreController } from './guias/guias-madre.controller';
import { GuiasMadreService } from './guias/guias-madre.service';
import { StockGuiasService } from './guias/stock-guias.service';
import { ValidacionController } from './calculos/validacion.controller';
import { ValidacionService } from './calculos/validacion.service';
import { ExploradorMaestrosController } from './maestros/explorador-maestros.controller';
import { ExploradorMaestrosService } from './maestros/explorador-maestros.service';
import { OpcionesController } from './maestros/opciones.controller';
import { OpcionesService } from './maestros/opciones.service';

/**
 * Operación del sistema nuevo (reemplazo del sistema viejo, ADR 0003):
 * coordinaciones, stock de guías, cálculos de liquidación. Trabaja sobre el
 * schema `documentos` (sincronizado desde Access mientras Access mande) y
 * resuelve nombres en `datos_maestros`.
 */
@Module({
  controllers: [
    CoordinacionesController,
    GuiasMadreController,
    ValidacionController,
    ExploradorMaestrosController,
    OpcionesController,
  ],
  providers: [
    NombresMaestrosService,
    CoordinacionesService,
    CoordinarService,
    GuiasMadreService,
    StockGuiasService,
    ValidacionService,
    ExploradorMaestrosService,
    OpcionesService,
  ],
  exports: [NombresMaestrosService, CoordinacionesService],
})
export class OperacionModule {}
