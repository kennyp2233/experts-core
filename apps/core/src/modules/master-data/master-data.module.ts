import { Module } from '@nestjs/common';
import { ProductosModule } from './productos/productos.module';
import { EmbarcadoresModule } from './embarcadores/embarcadores.module';
import { DestinoModule } from './destino/destino.module';
import { OrigenModule } from './origen/origen.module';
import { CaeAduanaModule } from './cae-aduana/cae-aduana.module';
import { ClientesModule } from './clientes/clientes.module';
import { ConsignatariosModule } from './consignatarios/consignatarios.module';
import { PaisesModule } from './paises/paises.module';
import { AcuerdosArancelariosModule } from './acuerdos-arancelarios/acuerdos-arancelarios.module';
import { ChoferesModule } from './choferes/choferes.module';
import { FincaModule } from './finca/finca.module';
import { MedidasModule } from './medidas/medidas.module';
import { FuncionarioAgrocalidadModule } from './funcionario-agrocalidad/funcionario-agrocalidad.module';
import { BodegueroModule } from './bodeguero/bodeguero.module';
import { AerolineaModule } from './aerolinea/v1/aerolinea.module';
import { AgenciaIataModule } from './agencia-iata/v1/agencia-iata.module';
import { SubAgenciaModule } from './sub-agencia/v1/sub-agencia.module';
import { TipoEmbarqueModule } from './tipo-embarque/v1/tipo-embarque.module';
import { TipoCargaModule } from './tipo-carga/v1/tipo-carga.module';
import { TipoEmbalajeModule } from './tipo-embalaje/v1/tipo-embalaje.module';

@Module({
  imports: [
    ProductosModule,
    EmbarcadoresModule,
    DestinoModule,
    OrigenModule,
    CaeAduanaModule,
    ClientesModule,
    ConsignatariosModule,
    PaisesModule,
    AcuerdosArancelariosModule,
    ChoferesModule,
    FincaModule,
    MedidasModule,
    FuncionarioAgrocalidadModule,
    BodegueroModule,
    AerolineaModule,
    AgenciaIataModule,
    SubAgenciaModule,
    TipoEmbarqueModule,
    TipoCargaModule,
    TipoEmbalajeModule,
  ],
  exports: [
    ProductosModule,
    EmbarcadoresModule,
    DestinoModule,
    OrigenModule,
    CaeAduanaModule,
    ClientesModule,
    ConsignatariosModule,
    PaisesModule,
    AcuerdosArancelariosModule,
    ChoferesModule,
    FincaModule,
    MedidasModule,
    FuncionarioAgrocalidadModule,
    BodegueroModule,
    AerolineaModule,
    AgenciaIataModule,
    SubAgenciaModule,
    TipoEmbarqueModule,
    TipoCargaModule,
    TipoEmbalajeModule,
  ],
})
export class MasterDataModule {}
