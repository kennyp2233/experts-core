# Sync Access ↔ EBF ↔ Postgres

> **Estado:** Implementado como Fase 1 (`sync/ebf-access`). **Desactualizado (20/10/2026):** hoy en EBF el exportador
> es cada finca y Experts es el *cliente* del vuelo, así que el filtro por exportador `EXPERTS HANDLING CARGO` no
> encuentra nada. Lo reemplaza la conciliación por guía hija de `operacion/ebf` (ADR 0004); conviene apagar este ciclo
> (`EBF_SYNC_AUTOSTART=false`): recorre despacho e histórico completos cada 15 min.
> **Última validación contra data real:** 2026-05-22 (incluyendo acciones update/delete).
> **Predecesores:** [decisions/0001-hybrid-access-postgres.md](../../../../../../docs/decisions/0001-hybrid-access-postgres.md), [EBF_PORTAL_TOMORROW.md](./EBF_PORTAL_TOMORROW.md).

## El problema

EXPERTS hoy hace el mismo proceso dos veces: una en su sistema Windows + Access viejo, otra en el portal EBF (que es el agente IATA / aerolínea consolidador). Doble entrada de datos para cada coordinación. La migración full de Access a PG se intentó antes y no avanzó — el alcance era demasiado grande.

Esta integración EBF abre una ventana para hacer **reconciliación entre los dos sistemas** sin tener que migrar nada todavía. Postgres se usa como **capa de sync state**, no como reemplazo de Access ni como UI primaria.

## Las 3 capas

### Access (legacy — source of truth operacional de EXPERTS)

Acceso via [legacy-bridge](../../../../legacy-bridge/server.js) + [LegacyDbService](../../templates/fito/services/legacy-db.service.ts) (path `host.docker.internal:3006` / Tailscale `100.87.139.83:3006`).

Tablas relevantes para sync:

| Tabla | Rol | Clave |
|---|---|---|
| `PIN_MCoordina` | Header de coordinación | `bodCodigo + docTipo + docNumero` (compuesta) |
| `PIN_dDocCoor` | Documento (1:1 con MCoordina), incluye **`docNumGuia` = AWB IATA real** | misma compuesta + `marCodigo` |
| `PIN_DCoordina` | Detalle por caja física, incluye **`detGuiaHija` = HAWB Access** y **`detFUE` = DAE SENAE** | compuesta + `detNumero` |
| `PIN_auxMarcas` | Consignees / marcaciones (`marCodigo`, `marNombre`, `marAlias`, `cliCodigo`) | `marCodigo` |
| `PIN_auxPlantaciones` | Fincas / shippers | `plaCodigo` |
| `PIN_auxAerolineas` | Carriers | `aerCodigo` |
| `PIN_auxDestinos` | Aeropuertos destino (`desCodigo` = IATA) | `desCodigo` |
| `PIN_auxClientes` | Clientes (1 nivel sobre marcaciones) | `cliCodigo` |
| `PIN_auxEmbarque` | Tipos de embarque / commodity codes | `embCodigo` |

**Campos `Sync` y `SyncType` ya existen** en PIN_MCoordina y PIN_DCoordina — sin uso confirmado, posiblemente legacy o reservados para futuro. NO depender de ellos hasta entender qué los escribe.

### EBF (externa — source of truth para AWBs reales asignados por carriers)

Acceso vía nuestro módulo [ebf-portal/](./). Dos cuentas/roles separados (cookie jars independientes):

| Rol | Cuenta | Namespace | Qué ve / hace |
|---|---|---|---|
| Manager | `manager@expertshcargo.com` | `/exportador/*` | Despacho de TODOS los exportadores del agente EBF, write (coordinar), DAEs, histórico |
| Cliente | `expertshcargosa@gmail.com` | `/customer/*` | Solo sus AWBs (filtrados por consignees propios), read-only, export XLSX |

Endpoints integrados y operativos: ver [EBF_PORTAL_TOMORROW.md](./EBF_PORTAL_TOMORROW.md) sección "Endpoints expuestos".

### Postgres (nuevo — vacío para AWB/coordinación)

Schemas existentes relevantes:

- **`documentos/`** ([prisma/documentos/schema.prisma](../../../../prisma/documentos/schema.prisma)): ya tiene el modelo paralelo COMPLETO de coordinación — `DocumentoBase`, `GuiaMadre`, `DocumentoCoordinacion`, `DocumentoRuta`, `DocumentoCosto`, `GuiaHija`, `GuiaHijaDetalle`, `TipoCaja`. **Vacío en producción** — nadie lo escribe todavía.
- **`datos-maestros/`** ([prisma/datos-maestros/schema.prisma](../../../../prisma/datos-maestros/schema.prisma)): `Consignatario`, `Cliente`, `Embarcador`, `Finca`, `Aerolinea`, `Destino`, `Origen`, `Producto`, `TipoEmbarque`. Algunos con data parcial.

El sync side-car va en un schema NUEVO: `prisma/extensions/ebf-portal/`. Tablas explicadas más abajo.

## Anclas de matching

### 🟢 Cruzan 1:1 (sin transformación)

#### 1. AWB string

| Sistema | Columna | Formato observado |
|---|---|---|
| Access | `PIN_dDocCoor.docNumGuia` | `"157-4665 4543"` (con espacio) |
| EBF cliente | columna AWB de `/customer/awb/list/` | `"157-4665 4543"` (con espacio) |
| EBF manager | columna AWB de `/exportador/coordinacion/lista/` | `"157-46654543"` (SIN espacio) |

**Normalización:** quitar espacios → match exacto.

Confirmado empíricamente con 3/3 AWBs comunes (ver tabla de validación abajo).

#### 2. DAE / FUE (SENAE)

Lo que Access llama **FUE** (`PIN_DCoordina.detFUE`) y EBF llama **DAE** (columna DAE del despacho manager + label del select del modal Coordinar) **es el mismo identificador SENAE**:

```
055-AAAA-40-XXXXXXXX   (Access detFUE samples)
055-AAAA-40-XXXXXXXX   (EBF DAE column samples)
```

Formato idéntico, asignado por aduanas Ecuador. Match exacto por string.

Cardinalidad: **un FUE/DAE puede aparecer en múltiples `detNumero`** del mismo `docNumero` Access (mismo trámite SENAE, varias cajas).

### 🟡 Cruzan con regla determinística (sin catálogo)

#### 3. Aerolínea (por prefijo IATA del AWB)

Los primeros 3 dígitos del AWB son el código IATA del carrier (estándar internacional):

| Prefijo | Carrier | Access `aerCodigo` | EBF airline string |
|---|---|---|---|
| 157 | Qatar Airways | 42 | "(QR) QATAR AIRWAYS" |
| 176 | Emirates Sky Cargo | 32 | "(EK) EMIRATES SKY CARGO" |
| 543 | Aercaribe | 49 | "(JK) AERCARIBE" |
| 145 | KLM/Air France | TBD | TBD |
| 369 | TBD | TBD | TBD |

No requiere cruzar el catálogo `PIN_auxAerolineas` con el de EBF — basta con extraer el prefijo del AWB.

#### 4. Destino

| Sistema | Formato |
|---|---|
| Access | `desCodigo` IATA puro: `"TSE"`, `"ALA"`, `"AMS"` |
| EBF cliente | con prefijo país: `"KZTSE"`, `"KZALA"`, `"AMS"` |

**Normalización:** si `len(ebf) == 5`, strip primeros 2 chars (prefijo país). Si `len == 3`, dejar como está.

### 🟠 N:1 con normalización + revisión humana

#### 5. Consignee

Access guarda el detalle **por handler/destino/truck**, EBF muestra el **alias agrupado**:

| Alias EBF | Marcaciones Access que colapsan a él |
|---|---|
| KAM | KAM JVP CONDOR (475), KAM ZENIT IP HANDLERS (587), KAM ZENIT IP HANDLERS NQZ (602), KAM CONDOR IP HANDLERS (583), KAM KN JVP CONDOR (528), KAM JVP CONDOR (475) |
| RDUHA | RDUHA VOSTOK IP HANDLERS (432), RDUHA VOSTOK IP HANDLERS NQZ (603), RDUHA 1 NQZ (610) |
| BRKAM | BRKAM ZENIT IP HANDLERS NQZ (616) |
| IRIDA LONG | (pendiente — no apareció en la búsqueda inicial, probablemente con sufijo) |

**Regla automática:** primer token del `marAlias` ≈ alias EBF. Funciona para los visibles pero **debe validarse con humano** antes de auto-aplicar. La tabla `EbfCatalogMapping` (más abajo) guarda explícito + `confidence`.

### 🔴 NO matchean (esperado, NO es bug)

#### 6. HAWB — granularidad fundamentalmente distinta

| | Access (`PIN_DCoordina.detGuiaHija`) | EBF (columna HAWB despacho manager) |
|---|---|---|
| Formato | entero puro `12033288` | string `"EBF100312224"` |
| Granularidad | **1 por caja física** (finca × producto × paquete) | **1 por coordinación EBF** (AWB × exportador × producto) |
| Cuántos por AWB | N (8-13 típico) | 1 |
| Quién asigna | EXPERTS internamente | EBF al `POST /exportador/detalle/create/` |

Son **dos conceptos parecidos pero NO equivalentes**. El "HAWB" de EBF es realmente *un id interno del registro de coordinación*; el HAWB Access es la cabecera de cada caja física.

#### 7. Pesos

`PIN_dDocCoor.docKgs` vs EBF `Gross Weight`: **están en el mismo orden de magnitud pero divergen 10-30%**. Razón probable: Access guarda peso neto del producto, EBF incluye empaque/paletas/etc.

Útil para **alertar discrepancias** (si la diferencia es > umbral X), no para matchear.

#### 8. Fecha

`PIN_MCoordina.docFecha` (cuando se coordinó / capturó en Access) vs EBF `ETD` (cuando vuela realmente). Diferencia típica 3-5 días.

Ejemplo real:
- Access docFecha = `2026-05-19` (para AWB 176-2654 4265)
- EBF ETD = `2026-05-22`

Útil como **señal de orden temporal**, no para matchear.

## Validación empírica (2026-05-22)

### Match-rate observado

Tomados los 4 AWBs visibles en el cliente EBF (2026-05-22 al 2026-05-26), buscados en Access por `docNumGuia`:

| AWB | Access `docNumero` | Encontrado en Access | Comentario |
|---|---|---|---|
| 157-4665 4532 | 13857 | ✅ | KAM ZENIT IP HANDLERS NQZ |
| 157-4665 4543 | 13858 | ✅ | RDUHA VOSTOK IP HANDLERS NQZ |
| 176-2654 4265 | 13855 | ✅ | RDUHA VOSTOK IP HANDLERS NQZ |
| 543-1861 6581 | (no) | ❌ | **NO es de EXPERTS** — pertenece a FLORIECOLOGIC. Apareció en cliente porque comparte consignee (IRIDA LONG). |

### Consistencia de métricas (los 3 que matchearon)

| AWB | Access `docFulls/docCajas` | EBF `BXS-COO/PCS-COO` | ¿Cuadra? |
|---|---|---|---|
| 157-4665 4532 | 4 / 11 | 4.000 / 11 | ✅ exacto |
| 157-4665 4543 | 4.75 / 12 | 4.750 / 12 | ✅ exacto |
| 176-2654 4265 | 3.75 / 9 | 3.750 / 9 | ✅ exacto |

### Verificación de DAE/FUE

Samples de `PIN_DCoordina.detFUE`:
```
055-2026-40-00751482
055-2026-40-00758816
055-2026-40-00761815
055-2026-40-00772738
```

Sample EBF DAE (de la fila de coordinación AWB 157-46654543):
```
055-2026-40-00751482
```

**Match exacto.** Ancla DAE válida a nivel detalle.

### Verificación de HAWB (asimetría confirmada)

| AWB | Access HAWBs (`detGuiaHija`, distintos) | EBF HAWB (manager) |
|---|---|---|
| 157-4665 4543 (Access #13858) | 12033293, 12033294, 12033295, 12033296, ... (8 detalles) | `EBF100312224` (uno solo) |
| 543-1861 6581 (no en Access) | — | `EBF100312236` |

Confirma 1:N entre EBF HAWB y Access HAWBs.

## Filtros obligatorios

### Por exportador (al lado EBF manager)

El manager view `/exportador/coordinacion/lista/` muestra carga de **todos los exportadores** del agente EBF (FLORICOLA ROOS, FLORIECOLOGIC, EXPERTS HANDLING CARGO, etc.). El sync hub **debe filtrar por exportador = EXPERTS HANDLING CARGO** antes de matchear contra Access; sino van a aparecer "ONLY_EBF" que en realidad son AWBs ajenos.

Filtro via query string del despacho: `?exportador=<id>` (id pendiente confirmar — buscar EXPERTS en `/coordinar/exportadores`).

### Por consignee (al lado cliente)

El cliente view ya filtra naturalmente — solo ve sus 4 consignees (BRKAM, IRIDA LONG, KAM, RDUHA). Pero un AWB del cliente puede pertenecer a OTRO exportador (caso 543-1861 6581 = FLORIECOLOGIC). El sync hub debe registrar el exportador real (lo trae el manager view) para evitar atribuir a EXPERTS coordinaciones ajenas.

## Acciones disponibles sobre coordinaciones ya creadas (EBF manager)

Mapeadas en vivo 2026-05-22. Hay exactamente **2 acciones por fila** del despacho — sin alternativas ocultas.

### ✏️ UPDATE — `/exportador/coordinacion/<detalleId>/update/`

**`GET`** → retorna HTML del modal de edición.

Campos READ-ONLY (mostrados como info contextual, no editables):
| Field | Ejemplo |
|---|---|
| Exportador | "R DEL CORAZON" |
| Marcación | "DINEL KZ" |
| Cliente | "PROVENTUS LLC" |
| Despacho (fecha vuelo) | "2026-05-23" |
| **AWB** | "172-04020365" |
| **HAWB** (EBF) | "EBF100312058" |
| **DAE** | "055-2026-40-00754055" |

Campos EDITABLES:
- `producto` — select (mismas opciones que el create modal: HORTENSIA, ROSAS, etc. con flags `data-is-full-bxs` / `data-is-compound-product` / `data-error-message`)
- `fb_coo`, `hb_coo`, `qb_coo`, `eb_coo` — number inputs (mismo comportamiento: FB readonly salvo full-bxs)
- `bxs_coo`, `pcs_coo` — readonly, recalculados server-side igual que en create
- `compound_products-*` — formset idéntico al create modal, con `value="<detalleId>"` ya inyectado en `compound_products-N-detalle_coordinacion`

⚠️ **NO se puede mutar**: AWB, HAWB, DAE, vuelo, exportador, marcación, consignatario. Si hay que corregir esos → **delete + recreate**.

⚠️ **Bloqueo condicional de `producto`**: si la coordinación ya tiene transacciones de bodega (WH), el div del producto se muestra con mensaje "*No se puede editar el Producto, existen Transacciones de Bodega*". Detectable parsing el HTML.

**`POST`** mismo path con body urlencoded:
```
csrfmiddlewaretoken=...
producto=<id>
fb_coo=0  hb_coo=2  qb_coo=0  eb_coo=0
bxs_coo=1.000  pcs_coo=2     (el portal los re-calcula, podemos enviar 0)
compound_products-TOTAL_FORMS=2
compound_products-INITIAL_FORMS=0
compound_products-MIN_NUM_FORMS=2
compound_products-MAX_NUM_FORMS=1000
compound_products-0-id=...   (si edita existente)
compound_products-0-detalle_coordinacion=387985
compound_products-0-producto=...
compound_products-1-* ...
```

Respuesta esperada: 302 + redirect a lista → reload; o 200 con form re-renderizado con errores.

### 🗑️ DELETE — `/exportador/detalle/<detalleId>/delete/`

⚠️ **Asimetría de prefijo:** delete usa `/detalle/<id>/delete/`, update usa `/coordinacion/<id>/update/`. Mismo `detalleId`. Bug-prone — guardar ambas constantes en config para no confundir.

**`GET`** → modal de confirmación minimal (~1.7KB):
- Texto: `ELIMINAR EBF100312058 - (387985) (ID: 387985)`
- Form interior con `<input name="csrfmiddlewaretoken">` y botones Aceptar/Cancelar

**`POST`** mismo path — borra. Body: solo `csrfmiddlewaretoken`. Sin payload adicional.

### Lo que NO existe (verificado)

Ninguna de estas acciones aparece en la columna "Acciones" del despacho actual:
- Duplicate / clone coordinación
- View detail (page completa de la coordinación)
- Mark as departed / change status
- Upload document (los docs llegan via otro flujo aún sin mapear)
- Reassign consignee / exportador
- Add note / comment

Si el negocio necesita alguna de estas, hay que pedirle a EBF que lo agregue o construirla del lado nuestro (PG side-car).

### El histórico tiene comportamiento distinto

No probado a fondo pero el footer del [coordinar page](./research/detalle_coordinacion.html) decía: *"Únicamente se pueden Editar/Eliminar los detalles con fecha de coordinación igual a la actual."* — implica que coordinaciones de días pasados no permiten update/delete. Verificar empíricamente cuando se necesite tocar histórico.

### Granularidad de `detalleId` y match con sync

El `detalleId` (387985, 388018, etc.) identifica una **coordinación EBF = 1 fila del despacho = 1 HAWB EBF = 1 combinación (AWB × exportador × producto)**.

Ejemplos reales:
| AWB | Exportador | detalleIds en EBF |
|---|---|---|
| 157-46654543 | EXPERTS HANDLING CARGO (RDUHA) | `387985` (1 fila) |
| 543-18616581 | FLORIECOLOGIC | `387989`, `387995`, `388015`, `388019` (4 filas → 4 productos distintos en el mismo AWB) |

**Esto corrige la granularidad del schema side-car:** la tabla principal no es AWB, es **coordinación EBF**. Schema actualizado abajo.

## Schema side-car propuesto

Schema nuevo a crear: `prisma/extensions/ebf-portal/schema.prisma`.

### Tabla principal — match a nivel coordinación EBF (no AWB)

```prisma
model EbfCoordinacionSync {
  id              Int      @id @default(autoincrement())
  
  // === Identidad EBF (id accionable — usado para update/delete) ===
  ebfDetalleId    Int      @unique  // 387985 — id de la fila de coordinación EBF
  ebfHawbCode     String?  @unique  // "EBF100312224" — alternate key humano
  ebfAwbCustomerId Int?              // 9850 — id del lado cliente (si está visible)
  
  // === Identidad Access (puede ser N filas Access por 1 coordinación EBF) ===
  // (relación se materializa en EbfDetalleAccessLink para 1:N — ver tabla abajo)
  
  // === Identificadores cruzados ===
  awbNumber       String   // "157-46654543" — normalizado sin espacio
  daeNumber       String?  // "055-2026-40-00756398"
  exportadorEbf   String   // "EXPERTS HANDLING CARGO" / "FLORIECOLOGIC" / ...
  consigneeAlias  String?  // "KAM", "RDUHA" — alias EBF
  productoEbf     String?  // "ROSAS", "HORTENSIA", etc.
  productoEbfId   Int?     // 1, 314, etc.
  fechaVuelo      DateTime?
  destinoFinal    String?  // "KZTSE", "KZALA"
  
  // === Snapshot de métricas EBF (para detectar cambios al pollear) ===
  ebfFbCoo        Float?
  ebfHbCoo        Float?
  ebfQbCoo        Float?
  ebfEbCoo        Float?
  ebfBxsCoo       Float?
  ebfPcsCoo       Float?
  ebfBxsWh        Float?   // 0 mientras no se cierre en WH
  ebfPcsWh        Float?
  
  // === Estado del match ===
  matchStrategy   String   // AWB_EXACT | DAE_ONLY | COMPOSITE | MANUAL | NONE
  matchConfidence Float    // 0.0–1.0
  status          String   // SYNCED | ONLY_ACCESS | ONLY_EBF | MISMATCH | MANUAL_REVIEW | IGNORED
  isOwnedByExperts Boolean @default(false) // false para AWBs ajenos (FLORIECOLOGIC, etc.)
  discrepancies   Json?    // { bxsCoo: {access: 4, ebf: 4.25}, ... }
  
  // === Auditoría ===
  lastSyncAt      DateTime?
  lastChangedAt   DateTime? // cuándo cambió algo en EBF
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // === Relaciones ===
  accessLinks     EbfDetalleAccessLink[]
  
  @@index([awbNumber])
  @@index([daeNumber])
  @@index([status, exportadorEbf])
  @@index([lastSyncAt])
}

/** Une 1 coordinación EBF con N detalles Access (asimetría confirmada). */
model EbfDetalleAccessLink {
  id              Int      @id @default(autoincrement())
  ebfSyncId       Int
  ebfSync         EbfCoordinacionSync @relation(fields: [ebfSyncId], references: [id], onDelete: Cascade)
  
  // Acceso (clave compuesta como columnas indexadas, NO FK)
  accessBodCodigo Int
  accessDocTipo   String
  accessDocNumero Int
  accessDetNumero Int?  // null si es solo header-level link
  accessHawb      BigInt? // detGuiaHija — el HAWB físico de Access
  accessPlaCodigo Int?  // finca
  accessProCodigo String? // producto Access
  accessFue       String? // detFUE
  
  matchReason     String  // AWB_EXACT | FUE_EXACT | COMPOSITE | MANUAL
  createdAt       DateTime @default(now())
  
  @@index([accessBodCodigo, accessDocTipo, accessDocNumero])
  @@index([accessFue])
  @@index([accessHawb])
}
```

### Tabla detalle: ahora unificada en `EbfDetalleAccessLink` (arriba)

La versión previa de este doc proponía separar "header" vs "detalle" forward-only. Eso era incorrecto: ahora sabemos que el `detalleId` EBF es el id a nivel coordinación accionable, y la relación N:1 (Access:EBF) vive en `EbfDetalleAccessLink` directamente — no hay un nivel intermedio que justifique una segunda tabla.

### Catálogo de mapeo entre IDs internos (consignees, fincas, etc.)

```prisma
model EbfCatalogMapping {
  id          Int    @id @default(autoincrement())
  entityType  String // consignee | shipper | airline | destination | product
  accessId    String?
  ebfId       String?
  name        String // para debug humano
  confidence  Float? @default(1.0)
  isManual    Boolean @default(false) // verificado por humano
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([entityType, accessId])
  @@unique([entityType, ebfId])
  @@index([entityType])
}
```

## Estrategia por fases

### Fase 1 — Sync read-only (2 tablas + worker)

**Objetivo:** visibilidad de match-rate y discrepancias sin escribir a nadie.

- Schema side-car (`EbfSyncMapping` + `EbfCatalogMapping`).
- Worker (`@nestjs/schedule` o Bull) que corre cada N minutos:
  1. Pull EBF manager filtrado por exportador EXPERTS → lista de AWBs.
  2. Pull EBF cliente (todos los AWBs visibles).
  3. Read Access via bridge: SELECT recientes de `PIN_dDocCoor` JOIN `PIN_MCoordina`.
  4. Match por `awbNumber` (normalizado, sin espacio). Backup: por `daeNumber`.
  5. Upsert `EbfSyncMapping` con estado correspondiente.
  6. Para los MATCHED: comparar BXS/PCS, marcar MISMATCH si difieren.
- Endpoint para consultar el estado de sync por bucket.
- **No toca Access, no toca PG documentos, no escribe a EBF.**

Esfuerzo estimado: 3-5 archivos. Visibilidad inmediata.

### Fase 2 — UI de reconciliación

Vista en [experts-front-core/](../../../../../../experts-front-core/) que muestre:
- 3 buckets: SYNCED / ONLY_ACCESS / ONLY_EBF / MISMATCH
- Por cada fila: AWB, exportador, consignee, fecha, métricas Access vs EBF lado a lado
- Acción manual: "ignorar este AWB" (para los ajenos como FLORIECOLOGIC) / "marcar como resuelto"

### Fase 3 — Forward-only persist a PG

Cuando F1 + F2 estén estables, el worker también hace upsert al schema `documentos/` (`DocumentoCoordinacion + GuiaMadre + GuiaHija + GuiaHijaDetalle`) para coordinaciones nuevas. **Sin backfill** de Access — solo coordinaciones que arranquen desde el día que se active F3.

Esfuerzo: ~5-7 archivos. Empieza a poblar el modelo PG existente con data real.

### Fase 4 — Coordinación primaria desde EXPERTS

UI en EXPERTS para crear coordinaciones que:
- Persiste en PG (`DocumentoCoordinacion`).
- Llama nuestro `POST /coordinar` (manager EBF) — ya integrado.
- Captura el HAWB EBF asignado, escribe `EbfDetalleMapping`.
- **Operador deja de tipear en EBF.** Sigue tipeando en Access (el sistema Windows no cambia).

### Fase 5 (futuro — no comprometido)

Modo 3 (write a Access) — cuando F1-4 estén probadas en producción durante meses. Esto cierra el círculo: EXPERTS UI escribe a PG + EBF + Access en una transacción lógica. Solo entonces el operador deja de tipear en Access.

## Reglas de quién gana en conflictos

| Sistema | Rol en el sync |
|---|---|
| Access | Oficial para reportes, contabilidad, FITOs, guías de remisión legacy. Modificado por el sistema Windows. NUNCA por nosotros (en F1-4). |
| PG | Storage para features nuevas, auditoría, sync state. Source of truth para data que EXPERTS crea via su UI nueva (F4+). |
| EBF | Tercer testigo — refleja lo que el carrier procesó. NO es source of truth para EXPERTS. |

**En conflicto:** humano resuelve. No auto-resolve. La UI de reconciliación (F2) hace eso visible.

## Anti-foot-guns

- **No asumir que un AWB en EBF cliente es de EXPERTS.** Validar con manager view (que trae el exportador) antes de marcar discrepancia.
- **No matchear HAWB por valor.** Son numeraciones independientes con granularidad distinta.
- **No usar pesos como ancla de match.** Divergen sistemáticamente (Access neto vs EBF gross).
- **No usar `Sync` / `SyncType` de Access** como indicadores de estado de sync hasta confirmar qué los escribe. Mantener nuestro estado en `EbfSyncMapping.status`.
- **Normalizar AWB string** (sin espacio) en TODO match. Access y EBF cliente lo guardan con espacio; EBF manager sin.
- **No escribir a Access en F1-4.** Modo 3 está fuera de scope hasta F5.

## Open questions

1. ~~Endpoint de edit/delete en EBF manager.~~ **Resuelto** — ver sección "Acciones disponibles" arriba. Update = `/exportador/coordinacion/<id>/update/`, Delete = `/exportador/detalle/<id>/delete/`.
2. **Volumen real de Access.** ¿Cuántas coordinaciones por día/semana? Define el polling rate del worker (¿cada 5 min, 15 min, 1 hora?).
3. **Regla N:1 de consignees.** Cuando una marcación Access tiene sufijos múltiples (KAM ZENIT vs KAM CONDOR), ¿el operador prefiere ver granularidad Access o agregación EBF en la UI de reconciliación?
4. **XLSX export del cliente EBF.** Probablemente tenga IDs internos / metadata que el HTML no expone. Vale la pena parsear el XLSX para enriquecer el match-rate.
5. **`embCodigo` en `PIN_MCoordina`.** Apunta a `PIN_auxEmbarque` (commodity codes). ¿Tiene equivalente en EBF? Posiblemente en el tipo de embarque que EBF reporta.
6. **Reglas de visibilidad cross-exportador en EBF.** ¿Por qué el cliente EXPERTS ve un AWB de FLORIECOLOGIC? ¿Es normal? ¿Hay otros AWBs ajenos por descubrir? Confirmar con el negocio.
7. **`docTipo` en Access.** Los samples vistos son "COO" y "CGU". ¿Qué representa cada uno? ¿Ambos van a sincronizarse o solo "COO" (coordinación)?

8. **Acciones en histórico.** El despacho solo permite update/delete en coordinaciones del día actual ("Únicamente se pueden Editar/Eliminar los detalles con fecha de coordinación igual a la actual"). ¿En histórico hay alguna acción de read-only / re-emisión? Verificar empíricamente cuando se necesite.

9. **Captura de `detalleId` al crear.** Hoy el `POST /coordinar` de nuestro service devuelve 302 + redirect a la lista. Para capturar el `detalleId` recién creado **necesitamos** parsear la lista post-302 y buscar la fila nueva por timestamp/hash. Alternativa: hacer un GET inmediato a la lista filtrado por AWB + producto + exportador y tomar el último id. Vale verificar si el portal devuelve `Location` con el id o si hay un endpoint JSON que lo retorne.

## Referencias

### Documentos
- [EBF_PORTAL_TOMORROW.md](./EBF_PORTAL_TOMORROW.md) — estado actual de la integración EBF (endpoints, parsers, anti-foot-guns)
- [docs/decisions/0001-hybrid-access-postgres.md](../../../../../../docs/decisions/0001-hybrid-access-postgres.md) — decisión arquitectura híbrida
- [CLAUDE.md](../../../../../../CLAUDE.md) — convenciones del workspace, 3 modos de operar Access ↔ PG

### Código clave
- [legacy-bridge/server.js](../../../../legacy-bridge/server.js) — bridge HTTP → Access
- [legacy-db.service.ts](../../templates/fito/services/legacy-db.service.ts) — único cliente que toca Access en el monorepo (referencia para queries)
- [services/customer-awb.service.ts](./services/customer-awb.service.ts) — vista cliente EBF
- [services/coordinacion-create.service.ts](./services/coordinacion-create.service.ts) — vista manager EBF (write)
- [prisma/documentos/schema.prisma](../../../../prisma/documentos/schema.prisma) — modelo PG ya diseñado para coordinación

### Datos crudos de la investigación
- [research/](./research/) — HTML/JS capturado de los 2 roles EBF (2026-05-19 y 2026-05-22)

### Queries Access usadas en la validación
```sql
-- Sample de AWBs recientes (descubre formato docNumGuia)
SELECT TOP 20 docNumero, docNumGuia
FROM PIN_dDocCoor
WHERE docNumGuia IS NOT NULL
ORDER BY docNumero DESC

-- Match de un AWB EBF contra Access
SELECT m.docFecha, m.docDestino, d.docNumGuia, d.marCodigo, mar.marAlias,
       d.aerCodigo, aer.aerAlias, d.docFulls, d.docCajas, d.docKgs
FROM ((PIN_dDocCoor d
  INNER JOIN PIN_MCoordina m ON d.bodCodigo=m.bodCodigo
                            AND d.docTipo=m.docTipo
                            AND d.docNumero=m.docNumero)
  LEFT JOIN PIN_auxMarcas mar ON d.marCodigo=mar.marCodigo)
  LEFT JOIN PIN_auxAerolineas aer ON d.aerCodigo=aer.aerCodigo
WHERE d.docNumGuia IN ('157-4665 4532', '157-4665 4543', '176-2654 4265')

-- HAWBs (detGuiaHija) + FUE/DAE de los detalles
SELECT docNumero, detNumero, marCodigo, plaCodigo, detGuiaHija,
       detFull, detCajas, detKgs, detFUE
FROM PIN_DCoordina
WHERE docNumero IN (13855, 13857, 13858)
ORDER BY docNumero, detNumero
```
