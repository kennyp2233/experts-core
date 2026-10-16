import { EntidadSync } from '../../engine/sync.types';
import { aerolinea, aerolineaRuta } from './aerolineas';
import {
  acuerdoArancelario,
  caeAduana,
  tipoCarga,
  tipoDocumentoIdentidad,
  tipoEmbalaje,
} from './catalogos';
import { finca, fincaProducto, registroAgrocalidad } from './fincas';
import { destino, origen, otroDestino, pais } from './geografia';
import {
  agenciaIata,
  bodeguero,
  chofer,
  funcionarioAgrocalidad,
  subAgencia,
  tipoEmbarque,
} from './operacion';
import { parametro } from './parametros';
import { medida, producto, productoComponente } from './productos';
import { cliente, consignatario, embarcador } from './terceros';

/**
 * Orden de sincronización: cada entidad va después de las que referencia
 * (sus FKs se resuelven con los ids de las anteriores).
 */
export const ENTIDADES_MAESTROS: ReadonlyArray<EntidadSync<any, any>> = [
  tipoDocumentoIdentidad,
  caeAduana,
  tipoCarga,
  tipoEmbalaje,
  acuerdoArancelario,
  pais,
  destino,
  origen,
  otroDestino,
  medida,
  producto,
  productoComponente,
  tipoEmbarque,
  embarcador,
  cliente,
  consignatario,
  finca,
  fincaProducto,
  registroAgrocalidad,
  chofer,
  bodeguero,
  funcionarioAgrocalidad,
  subAgencia,
  agenciaIata,
  aerolinea,
  aerolineaRuta,
  parametro,
];
