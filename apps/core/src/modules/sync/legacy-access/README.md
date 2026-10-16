# Sync Access → Postgres (sistema viejo)

Copia los datos del sistema viejo (`ExpertsHandlingCargo.mdb`, vía legacy-bridge) a Postgres. **Access manda**: el sync solo lee de Access (SELECT) y sobrescribe PG. Es la base para reemplazar el sistema viejo (ver [ADR 0003](../../../../../../../docs/decisions/0003-replicar-legacy-datos-maestros.md)). Cómo funciona el sistema viejo por dentro: [legacy-analysis/](../../../../../../../legacy-analysis/INDEX.md).

Dos grupos:

| Grupo | Schema PG | Qué | Lectura |
|---|---|---|---|
| `maestros` | `datos_maestros` | marcas, fincas, aerolíneas, productos, destinos, parámetros… | siempre completa (~1.800 filas, ~10 s) |
| `documentos` | `documentos` | stock de guías AWB, coordinaciones, guías hijas, liquidación | **incremental** (lo reciente o modificado) o completa (~13 mil coordinaciones / 168 mil líneas) |

## Cómo corre

Todo va por una sola cola Bull (`legacy-access-sync`, concurrencia 1): nunca hay dos corridas a la vez contra Access.

| Job | Cuándo (hora Ecuador) | Qué hace |
|---|---|---|
| maestros | cada `LEGACY_SYNC_INTERVAL_MIN` (60) | Lee todo, escribe solo lo que cambió |
| maestros forzado | `LEGACY_SYNC_FORZADO_CRON` (`0 3 * * *`) | Reescribe todo: corrige ediciones/borrados hechos a mano en PG |
| documentos incremental | cada `LEGACY_SYNC_DOCS_INTERVAL_MIN` (15) | Stock de guías completo + coordinaciones de los últimos `LEGACY_SYNC_DOCS_VENTANA_DIAS` (15) días o modificadas (`dDocUsuario.docFecAct`) desde la última corrida buena |
| documentos completo | `LEGACY_SYNC_DOCS_COMPLETO_CRON` (`30 3 * * *`) | Todas las coordinaciones; además detecta las borradas en Access |
| al arrancar la API | +1 min maestros, +3 min documentos | Para no esperar un intervalo completo |

- Manual: `POST /api/v1/sync/legacy-access/run?grupo=&modo=&dryRun=&forzar=&entidades=` (admin), `GET …/ejecuciones?grupo=`, `GET …/entidades`; o en la terminal `npm run sync:legacy -- [--grupo=maestros|documentos] [--completo] [--dry-run] [--forzar] [--entidades=a,b]`.
- Si el bridge no responde (la PC con Access apagada) la corrida queda `OMITIDO` y se reintenta en el siguiente ciclo.
- Sin una corrida buena previa del grupo, el modo incremental se convierte en completo.
- `LEGACY_SYNC_AUTOSTART=false` apaga el cron (dev / tests).

## Cómo decide qué escribir (`engine/`)

Por cada registro (en documentos: cada coordinación con todas sus tablas) calcula lo que escribiría en PG y su hash, y lo compara con la bitácora `SyncLegacyRegistro` (una por schema):

- **Igual** → no toca PG.
- **Distinto o nuevo** → upsert por la clave natural (`codigoAccess`, `codigo`, `numero`…) en una transacción junto con su fila de bitácora. Las tablas hijas (aranceles, conceptos, rutas, guías hijas, liquidaciones…) se reemplazan completas.
- **Ya no está en Access** (solo en lecturas completas) → maestros: se desactivan (`estado = false`); coordinaciones: se borran con sus hijos; guías madre: se dejan (las coordinaciones les apuntan).
- Un error en un registro no frena el resto; queda en el resumen de la corrida (`SyncLegacyEjecucion`, en datos_maestros, con `grupo` y `modo`).
- Las FKs entre schemas (documentos → datos maestros) son lógicas y se resuelven con la bitácora de maestros.

## Grupo maestros (orden)

| Entidad | Access | PG |
|---|---|---|
| tipoDocumentoIdentidad | CAE_TIPODOCUMENTO | TipoDocumentoIdentidad |
| caeAduana | CAE_ADUANA | CaeAduana |
| tipoCarga, tipoEmbalaje | `ecuapass - experts.mdb` (copia fija en `data/catalogos-ecuapass.ts`) | TipoCarga, TipoEmbalaje |
| acuerdoArancelario | mipro_tipos_certificado | AcuerdoArancelario |
| pais | PIN_auxPaises | Pais |
| destino / origen | PIN_auxDestinos (`desTipo` DES / ORI) | Destino / Origen |
| otroDestino | PIN_auxOtrDes | OtroDestino |
| medida | PIN_auxUnidades | Medida |
| producto | PIN_MProductos + PIN_DProCodAso + PIN_DProDecAdi + mipro_producto_arancel | Producto + ProductosAranceles + ProductosCompuesto + ProductosMiPro |
| productoComponente | PIN_dProComp | ProductoComponente |
| tipoEmbarque | PIN_auxEmbarque | TipoEmbarque |
| embarcador | PIN_auxClientes | Embarcador |
| cliente | PIN_auxClientesAux | Cliente |
| consignatario | PIN_auxMarcas | Consignatario + 6 subtablas |
| finca | PIN_auxPlantaciones | Finca |
| fincaProducto | PIN_auxPlanProductos | FincaProducto |
| registroAgrocalidad | pin_auxagrocalidad | RegistroAgrocalidad |
| daeFinca | awbm_auxdaes (registro de DAEs: finca, origen, país, vigencia; ~10.400, las cargan las fincas por la web) | DaeFinca |
| chofer, bodeguero, funcionarioAgrocalidad, subAgencia | PIN_auxChofers, PIN_auxBodegueros, PIN_auxFuncionarios, PIN_auxSubagencias | Chofer, Bodeguero, FuncionarioAgrocalidad, SubAgencia |
| agenciaIata | PIN_auxShippers | AgenciaIata |
| aerolinea | PIN_auxAerolineas | Aerolinea + AerolineasPlantilla + ConceptoCosto |
| aerolineaRuta | PIN_auxAeroRuta | AerolineaRuta |
| parametro | _PARAMETROS, _PIN_MParams, eEmpresa, eBodega | Parametro (clave/valor) |

## Grupo documentos (orden)

| Entidad | Access | PG |
|---|---|---|
| loteGuias | PIN_MCoordina `CGU` + dDocUsuario | DocumentoBase |
| guiaMadre | PIN_DCoorGuias (clave: AWB sin espacios) | GuiaMadre |
| coordinacion | PIN_MCoordina `COO` + PIN_dDocCoor + PIN_dDocExtra + PIN_dDocRuta + PIN_DCoorCAE + PIN_dDocMar + PIN_DCooMedidas + PIN_DCoordina + dDocUsuario | DocumentoCoordinacion + DocumentoLiquidacion (NORMAL / CORTE_EXTRA) + DocumentoRuta (con vuelos por tramo) + DocumentoManifiesto + DocumentoMarca + DocumentoMedida + GuiaHija + GuiaHijaDetalle |

- **Guías hijas**: las líneas de PIN_DCoordina agrupadas por `detGuiaHija` (el número HAWB). Cada línea es un `GuiaHijaDetalle` con fulls, cajas, kg, tallos, valor, DAE, medidas…; el tipo de caja se deduce de fulls/cajas (1 FB, 0,5 HB tabaco, 0,25 QB cuarto, 0,125 EB octavo; las mezclas quedan sin tipo).
- **Estados**: `docEstado` 1 abierta (BORRADOR), 2 cortada (CORTADO), 0 anulada. Las anuladas no tienen datos en Access: si estaban en PG se borran, si no se omiten.
- **Liquidación**: los valores de flete y cargos de PIN_dDocExtra; las columnas `*_ex` (corte extra) van como una segunda liquidación `CORTE_EXTRA`. Los totales (`docFlete`, `docTotal`, due agent/carrier…) quedan en `liq*` de la coordinación.
- **Rutas**: filas ORIGEN / DESTINO / VIA como en el modelo de aerolínea; vuelo y horarios de cada tramo van en su fila VIA.
- Valores sin semántica confirmada (docCA, docCFE, docCert, docFITO, awbFactura…) se guardan tal cual en `datosLegacy` (JSON).
- `DocumentoCosto` (snapshot de conceptos de la aerolínea) no se llena: Access guarda los importes calculados, no los conceptos.

Convenciones del sistema viejo que aplica el mapeo (`engine/normalize.ts`):
- En las tablas `PIN_*`, **`Estado = 0` es activo** (el ejecutable filtra `WHERE marEstado=0`). En `mipro_*` es al revés (1 = activo).
- Los textos con `||` son o bloques multilínea (datos de guía, FITO, Forma A → se guardan con saltos de línea) o campos por posición (`marCNE_CAE` = nombre‖dirección‖tipoDoc‖numDoc‖país; `marCNE` = nombre‖dirección‖ciudad‖país‖siglas‖EORI).
- Fechas: las de texto (`docFecha`, `extFechaDespacho`) son días → 00:00 UTC; las de hora (`detFecha`, vuelos) son hora de Ecuador → UTC; las de tipo fecha llegan del bridge ya en UTC.
- `aerPaisSigla` es en realidad el código IATA de la aerolínea; `aerModo` 0 = fulles, 1 = piezas; `aerCod1..8` → Costo guía, Combustible, Seguridad, IVA, Otros, Aux1, Aux2, cálculo auxiliar (inferido de la pantalla vieja; los `Peso = 1` se guardan como `CHARGEABLE_WEIGHT`).

## Lo que NO sincroniza (todavía)

- `PIN_NGH` / `PIN_dCoorNGH` (registro de números de guía hija asignados): va con la lógica de numeración; el contador `eBodega.bodNGH` llega como parámetro `BODEGA.bodNGH`.
- Guías certificadas (PIN_DCertGuias, PIN_DDocCert, PIN_MDocumento), FITOS viejos, facturación, guías de remisión, bodega, cobranzas: pendientes de confirmar si se usan hoy.
- `PIN_MCoorMul` (bloqueos de edición del sistema viejo) y `_WEB_RecordsDeleted`: operativos, no datos.
- Datos de la base `ecuapass - experts.mdb` que el bridge no alcanza (agencias con OCE, historial de envíos).

## Datos de Access que hoy se omiten (problemas de origen)

- `PIN_auxPaises`: una fila sin `paiCodigo`.
- `PIN_auxAeroRuta` de la aerolínea 20: usa como vía la aerolínea `GT`, que no existe en `PIN_auxAerolineas`.
- 2 líneas de PIN_DCoordina sin cabecera de coordinación.

## Agregar una tabla

1. Modelo en el `schema.prisma` del grupo con una clave única (`codigoAccess`, `codigo`, `numero`) + migración.
2. Un `EntidadSync` en `entities/<grupo>/` (leer con columnas explícitas — por lotes si es grande —, mapear, upsert por la clave).
3. Agregarlo al `index.ts` del grupo **después** de las entidades a las que apunta.
