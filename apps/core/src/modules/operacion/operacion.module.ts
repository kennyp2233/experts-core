import { Module } from '@nestjs/common';
import { LegacyDbModule } from '../integrations/legacy-db/legacy-db.module';
import { CoordinacionesController } from './coordinaciones/coordinaciones.controller';
import { CoordinacionesService } from './coordinaciones/coordinaciones.service';
import { CoordinarService } from './coordinaciones/coordinar.service';
import { NombresMaestrosService } from './maestros/nombres-maestros.service';
import { GuiasMadreController } from './guias/guias-madre.controller';
import { GuiasMadreService } from './guias/guias-madre.service';
import { StockGuiasService } from './guias/stock-guias.service';
import { IngresosGuiasService } from './guias/ingresos-guias.service';
import { ValidacionController } from './calculos/validacion.controller';
import { ValidacionService } from './calculos/validacion.service';
import { ExploradorMaestrosController } from './maestros/explorador-maestros.controller';
import { ExploradorMaestrosService } from './maestros/explorador-maestros.service';
import { OpcionesController } from './maestros/opciones.controller';
import { OpcionesService } from './maestros/opciones.service';
import { FlowerCargoService } from './documentos/flowercargo.service';
import { ReportesDiaService } from './documentos/reportes-dia.service';

/**
 * Operación del sistema nuevo (reemplazo del sistema viejo, ADR 0003):
 * coordinaciones, guías (ingreso y administración), cálculos de liquidación.
 * Trabaja sobre el schema `documentos` (sincronizado desde Access mientras
 * Access mande) y resuelve nombres en `datos_maestros`. Al sistema viejo solo
 * lo consulta (bridge, solo lectura) para no ingresar guías repetidas.
 */
@Module({
  imports: [LegacyDbModule],
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
    IngresosGuiasService,
    ValidacionService,
    ExploradorMaestrosService,
    OpcionesService,
    FlowerCargoService,
    ReportesDiaService,
  ],
  exports: [NombresMaestrosService, CoordinacionesService],
})
export class OperacionModule {}
