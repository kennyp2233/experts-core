# EBF Portal — estado

> Última captura logueada: 2026-05-22 (vista de cliente integrada).
> Coordinador submit real **NO** ejecutado todavía. Vistas cliente **NO** ejecutadas extremo a extremo todavía.

## Estado actual

### Listo y verificado contra el portal real

**Rol manager** (cuenta `EBF_PORTAL_USER`, namespace `/exportador/*`):
- Login + cookie jar + relogin transparente al ver 302→login.
- Lista de coordinaciones (despacho + histórico) — 15 columnas SSR.
- Lista de DAEs — columnas dinámicas.
- Página coordinar (`/exportador/detalle_coordinacion/`) — mapeo full:
  - Cascade `exportador → marcación → vuelo → DAE` (4 endpoints helper).
  - Card resumen del vuelo (`/exportador/detalle/vuelo/`).
  - Modal `Crear Detalle De Coordinación` (`/exportador/detalle/create/`):
    productos con flags (`isFullBxs`, `isCompoundProduct`, `errorMessage`),
    formset compuesto con `min_num_forms=2`, hidden replicado.
  - Calculadora `/exportador/box_weight_factor_calculator/` (POST JSON).
- Horarios — ventanas configuradas en
  [utils/horarios.util.ts](./utils/horarios.util.ts), aplicadas solo a writes.

**Rol cliente** (cuenta `EBF_PORTAL_CUSTOMER_USER`, namespace `/customer/*`):
- Login independiente con cookie jar separado (subclase
  [EbfCustomerHttpClient](./http/ebf-customer-http.client.ts) +
  [EbfCustomerAuthService](./auth/ebf-customer-auth.service.ts)).
- Lista AWBs (`/customer/awb/list/`) con filtros (`etd_start`, `etd_end`,
  `aerolinea`, `consignatarios`, `awb`), sort, paginación + totals del tfoot.
- Header card AWB (`/customer/awb/<id>/info/`) — AWB, Airline, ETD/ETA,
  Consignee, Shipper, Route + flags de tabs disponibles + document count.
- Tab CUSTOMERS (`/customer/awb/<id>/customers/`) — resumen por consignee.
- Tab DOCUMENTS (`/customer/awb/<id>/documents/`) — lista + URLs proxy de
  descarga (los archivos están detrás de la cookie, NO accesibles desde el
  front directamente).
- Tab INFO (`/customer/awb/<id>/details/`) — parser parcial: filtros (4
  selects) + HTML raw del contenedor de tablas para que el front lo
  renderice (estructura per-consignee compleja, parsearla server-side es
  churn por ahora).
- Export XLSX (`?_export=xlsx`) y descargas individuales/bulk de docs
  proxyados con `Content-Type` y `Content-Disposition` originales.
- Perfil cliente parseado a JSON.

### Estructura del módulo

```
ebf-portal/
├── ebf-portal.module.ts
├── ebf-portal.controller.ts             # manager: /api/v1/integrations/ebf-portal/*
├── ebf-customer.controller.ts           # cliente: /api/v1/integrations/ebf-portal/customer/*
├── ebf-portal.service.ts                # facade (manager + cliente)
├── config/ebf-portal.config.ts          # paths + env (ambos roles)
├── http/
│   ├── cookie-jar.ts
│   ├── ebf-http.client.ts                # manager (jar propio)
│   └── ebf-customer-http.client.ts       # cliente (subclass, jar propio)
├── auth/
│   ├── ebf-auth.service.ts               # manager
│   └── ebf-customer-auth.service.ts      # cliente
├── services/
│   ├── coordinacion.service.ts           # list/getDetalle (despacho) + update stub
│   ├── coordinacion-selection.service.ts # cascade + vuelo card (read-only)
│   ├── coordinacion-create.service.ts    # getCreateForm + calcBox + create
│   ├── dae.service.ts
│   └── customer-awb.service.ts           # list, header, tabs, export, docs, profile
├── parsers/
│   ├── csrf.parser.ts
│   ├── form-fields.parser.ts             # genérico (legacy)
│   ├── select-options.parser.ts
│   ├── vuelo-card.parser.ts
│   ├── coordinacion-list.parser.ts
│   ├── coordinacion-detail.parser.ts     # PLACEHOLDER (otra página, sin mapear)
│   ├── coordinacion-create-modal.parser.ts
│   ├── customer-awb-list.parser.ts
│   ├── customer-awb-header.parser.ts
│   ├── customer-awb-details.parser.ts    # parser parcial (raw HTML para tablas)
│   ├── customer-awb-customers.parser.ts
│   ├── customer-awb-documents.parser.ts
│   └── customer-profile.parser.ts
├── utils/horarios.util.ts
├── types/{coordinacion.types.ts, dae.types.ts, coordinacion-create.types.ts, customer-awb.types.ts}
├── dto/{create-coordinacion.dto.ts, update-coordinacion.dto.ts, box-weight.dto.ts}
└── research/                             # HTML/JS capturado de ambos roles
```

### Endpoints expuestos

Todos bajo `/api/v1/integrations/ebf-portal/`.

**Manager:**

| Verbo | Path | Service |
|---|---|---|
| GET | `/health` | facade |
| GET | `/coordinaciones?page&sort&historico` | coordinacion.list |
| GET | `/coordinaciones/:id` | coordinacion.getDetalle (raw HTML) |
| PUT | `/coordinaciones/:id` | coordinacion.update **(stub)** |
| GET | `/daes?page` | dae.list |
| GET | `/coordinar/exportadores` | selection.listExportadores |
| GET | `/coordinar/marcaciones?exportador` | selection.listMarcaciones |
| GET | `/coordinar/vuelos?exportador&marcacion` | selection.listVuelos |
| GET | `/coordinar/daes?exportador&marcacion&vuelo` | selection.listDaes |
| GET | `/coordinar/vuelo-card?exportador&marcacion&vuelo&dae?` | selection.getVueloCard |
| GET | `/coordinar/form?exportador&marcacion&vuelo&dae` | create.getCreateForm |
| POST | `/coordinar/box-weight` | create.calculateBoxWeight |
| POST | `/coordinar` | create.createCoordinacion **(write — no ejecutado todavía)** |

**Cliente** (bajo `/customer/`):

| Verbo | Path | Service |
|---|---|---|
| GET | `/customer/health` | facade.ensureCustomerSession |
| GET | `/customer/awbs?etdStart&etdEnd&...` | customer.list |
| GET | `/customer/awbs/:id` | customer.getHeader |
| GET | `/customer/awbs/:id/details?filters` | customer.getDetails |
| GET | `/customer/awbs/:id/customers?sort` | customer.getCustomers |
| GET | `/customer/awbs/:id/documents` | customer.getDocuments |
| GET | `/customer/awbs/:id/export?filters` | customer.exportDetailsXlsx (XLSX) |
| GET | `/customer/awbs/:id/documents/download-all` | customer.downloadAllDocuments (ZIP) |
| GET | `/customer/documents/download?file=...` | customer.downloadDocument (binario) |
| GET | `/customer/profile/:clienteId` | customer.getProfile |

### Contrato del portal — cheatsheet

```
GET /exportador/detalle_coordinacion/             → página HTML + (con HX-Request) tabla parcial
GET /exportador/populate_consignatario/?exportador=X
GET /exportador/populate_doc_coordinacion_select/?exportador=X&consignatario_marcacion=Y
GET /exportador/populate_exportador_dae_select/?exportador=X&consignatario_marcacion=Y&doc_coordinacion=Z
GET /exportador/detalle/vuelo/?exportador&consignatario_marcacion&vuelo&dae
GET /exportador/detalle/create/?exportador&consignatario_marcacion&vuelo&dae
POST /exportador/detalle/create/  (urlencoded — body en `coordinacion-create.service.ts:buildSubmitBody`)
POST /exportador/box_weight_factor_calculator/ (JSON {fb_coo, hb_coo, qb_coo, eb_coo})
```

⚠️ Nombre confuso: el select se llama `vuelo` en el DOM pero el endpoint de DAEs lo recibe como **`doc_coordinacion`**.

## Próximo paso — primera coordinación real

Plan de ejecución (con un humano supervisando cada paso):

1. **Smoke read-only end-to-end** desde un cliente HTTP (curl / Bruno):
   ```
   GET  /api/v1/integrations/ebf-portal/health
   GET  /api/v1/integrations/ebf-portal/coordinar/exportadores
   GET  /api/v1/integrations/ebf-portal/coordinar/marcaciones?exportador=164
   GET  /api/v1/integrations/ebf-portal/coordinar/vuelos?exportador=164&marcacion=164
   GET  /api/v1/integrations/ebf-portal/coordinar/daes?exportador=164&marcacion=164&vuelo=9721
   GET  /api/v1/integrations/ebf-portal/coordinar/vuelo-card?exportador=164&marcacion=164&vuelo=9721
   GET  /api/v1/integrations/ebf-portal/coordinar/form?exportador=164&marcacion=164&vuelo=9721&dae=21566
   ```
   Validar que los IDs reales tienen sentido (compararlos con lo que ve un usuario logueado en el portal).

2. **Dry run de la calculadora**:
   ```
   POST /api/v1/integrations/ebf-portal/coordinar/box-weight
   { "fb_coo": 0, "hb_coo": 4, "qb_coo": 0, "eb_coo": 0 }
   ```
   Confirmar que el resultado coincide con lo que muestra el modal del portal con esos mismos valores.

3. **Primer submit real (CON confirmación humana)**. Body mínimo:
   ```
   POST /api/v1/integrations/ebf-portal/coordinar
   {
     "exportadorId": 164,
     "consignatarioMarcacionId": 164,
     "docCoordinacionId": 9721,
     "daeId": 21566,
     "productoId": 1,
     "hbCoo": 1, "qbCoo": 0, "ebCoo": 0
   }
   ```
   Verificar:
   - Respuesta 302 `{ ok: true, status: 302, redirectTo: ... }`.
   - La coordinación aparece en `/exportador/coordinacion/lista/` del portal.
   - Si vuelve 200 con `errors[]`, parsear y corregir antes del siguiente intento.

4. **Auditoría posterior**. Cuando el flujo sea estable, persistir cada submit
   (DTO + status + redirect + errors + html truncado) en una tabla side-car PG
   `ebf_portal_coordinacion_audit`. Schema candidato:
   `prisma/extensions/ebf-portal/` (ver
   [docs/decisions/0001-hybrid-access-postgres.md](../../../../../../docs/decisions/0001-hybrid-access-postgres.md)).

## Decisiones pendientes

- **Concurrencia.** Hoy el submit es síncrono. Si el portal lo soporta mal,
  encolar con Bull (referencia: módulo `templates/fito`). Por ahora KISS.
- **Update / edit.** Form de edición no capturado. Cuando aparezca el caso de
  uso, mapear igual que create — el path es probablemente
  `/exportador/detalle/<id>/update/` o similar.
- **Borrado.** Mismo status que update.
- **Detalle individual.** [coordinacion-detail.parser.ts](./parsers/coordinacion-detail.parser.ts)
  sigue placeholder — esa página no es la de coordinar, es el detalle de una
  coordinación ya creada (URL todavía sin confirmar). Bajo demanda.
- **Trigger automatizado / cron.** Hoy todo es bajo demanda. Si en algún momento
  hay que coordinar masivamente desde EXPERTS, sumar `@nestjs/schedule` o un
  job Bull. Ver primero si el portal aguanta.

## Smoke tests recomendados (rol cliente)

```bash
API=http://localhost:3000/api/v1/integrations/ebf-portal/customer

# 1. health (debería loguear como expertshcargosa@gmail.com)
curl $API/health

# 2. lista del mes actual
curl "$API/awbs?etdStart=2026-05-01&etdEnd=2026-05-31"

# 3. detalle (sustituir <id> por uno de la lista — ej 9850)
curl $API/awbs/9850
curl $API/awbs/9850/details
curl $API/awbs/9850/customers
curl $API/awbs/9850/documents

# 4. export XLSX (guarda como archivo)
curl -o awb-9850.xlsx $API/awbs/9850/export

# 5. profile
curl $API/profile/570
```

Validaciones:
- Header `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` en el export.
- `downloads` en `/documents` apuntan a URLs `/api/v1/integrations/ebf-portal/customer/documents/download?file=...` — descargables sin estar logueado a EBF.
- `details.filters` contienen consignees/trucks/shippers que tiene el AWB.

## Anti-foot-guns

**Coordinador (manager):**
- **Nunca llamar `EbfCoordinacionCreateService.createCoordinacion()` fuera de
  ventana operativa.** El service ya lo bloquea, pero el front debe avisar
  antes de que el usuario llene el form.
- **No bypasear `assertCoordinacionWindow()`.** Si urge un test, hacerlo en
  staging contra un portal de pruebas, no comentando el guard.
- **No persistir el `rawHtml` del submit sin truncar.** Los responses 200 con
  errores pueden traer páginas completas — limitar a 50 KB para la auditoría.
- **CSRF se renueva por request.** No cachear `csrfToken` entre llamadas — el
  service ya lo re-extrae en cada `getCreateForm`.
- **El cascade depende de IDs válidos *entre sí*.** Si el exportador no tiene
  marcaciones para hoy, las listas vienen vacías — no es bug.

**Cliente:**
- **Las cuentas manager y cliente NO comparten cookie jar.** Cada una tiene su
  propio `EbfHttpClient` (subclase). Mezclar sesiones rompe la separación
  de permisos del portal y puede causar 403s confusos.
- **`/customer/documents/download?file=` valida el filename contra path
  traversal** (rechaza `..` y separadores). No exponer este endpoint en
  rutas públicas sin auth de EXPERTS.
- **El `rawTablesHtml` del tab INFO incluye `hx-*` attrs del portal.** Sin
  htmx cargado en el front quedan inertes, pero NO sanear ese HTML antes de
  renderizarlo en un contexto donde el usuario pueda subir HTML arbitrario
  (no es el caso hoy — el HTML viene del portal, pero conviene mantenerlo
  en mente).
- **El export XLSX no respeta paginación** — devuelve todos los datos del
  AWB según los filtros. Para AWBs muy grandes el tamaño del archivo puede
  ser notable; considerar streaming si llega a ser problema.
