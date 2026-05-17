# EBF Portal — continuar mañana

> Fecha de captura inicial: 2026-05-17 (domingo, fuera de ventana de coordinación 08:00–13:30 EC).
> El portal oculta acciones de creación/edición fuera de esa ventana — por eso quedaron stub.

## Estado actual

### Listo y verificado contra el portal real
- **Login**: GET `/accounts/login/?next=/` → extrae `csrfmiddlewaretoken` + cookie `__Secure-csrftoken` → POST a `/accounts/login/` con ambos. Retorna 302 y emite `__Secure-sessionid`.
- **Cliente HTTP**: cookie jar manual (sin tough-cookie), `maxRedirects: 0` para detectar 302→login y auto-reloguear (`EBF_SESSION_EXPIRED` → `forceRelogin()`).
- **Lista de coordinaciones**: parser tabla SSR de 15 columnas (`ETD, AWB, Exportador, Marcación, Producto, DAE, HAWB, BXS-COO, PCS-COO, BXS-WH, PCS-WH, Origen, D. AWB, D. Final, Creación`). Paginación detectada por `hx-get="?page=N"`.
- **Lista DAEs**: parser dinámico (headers `<th>` → keys), columnas a confirmar.
- **Histórico**: misma vista que lista, flag `includeHistorico` en query.
- **Horarios**: util `isWithinWindow()` con timezone `America/Guayaquil` aplicado solo a writes.

### Stub / pendiente
- **`create()` coordinación** — lanza `NotImplementedException` con mensaje claro.
- **`update()` coordinación** — idem.
- **`getDetalle()` parser** — retorna `raw.html` sin descomponer (no se vio HTML autenticado del detalle).
- **`detalleId` en filas de la lista** — extracción por regex genérica del path `/exportador/detalle_coordinacion/<id>/`. Si las filas usan htmx con atributos no estándar, queda `null`. Confirmar mañana.

## Cuando vuelvas (lunes 2026-05-18 en horario 08:00–13:30 EC)

### 1. Verifica login + lista funcionan end-to-end desde el back

```bash
# en el host del back, con .env apuntando a portal.ebfcargo.com y credenciales
curl http://localhost:3000/api/v1/integrations/ebf-portal/health
curl http://localhost:3000/api/v1/integrations/ebf-portal/coordinaciones
curl http://localhost:3000/api/v1/integrations/ebf-portal/daes
```

Si `health` falla, comprobar env vars:
- `EBF_PORTAL_USER` (`manager@expertshcargo.com`)
- `EBF_PORTAL_PASS`
- `EBF_PORTAL_BASE_URL` (default `https://portal.ebfcargo.com`)

### 2. Capturar HTML autenticado del detalle y de los forms

Loguearse desde el back (o reusar el curl manual del research) y guardar a disco:

```bash
# Detalle (sustituir <id> por uno real de la lista)
curl -sS -b cookies.txt "https://portal.ebfcargo.com/exportador/detalle_coordinacion/<id>/" > detalle.html

# Probable URL del form de creación — explorar también desde el dashboard logueado:
# 1) Abrir https://portal.ebfcargo.com/exportador/coordinacion/lista/ con la sesión activa
# 2) Buscar botón "Nueva coordinación" / "Crear" — capturar el href real
# 3) GET esa URL y guardar como create_form.html
```

### 3. Confirmar / refinar parsers

- `parsers/coordinacion-list.parser.ts:DETAIL_RX` — comprobar que las filas reales tienen una URL `/exportador/detalle_coordinacion/<id>/` o un `hx-get`/`data-id`. Si es diferente, ajustar.
- `parsers/coordinacion-detail.parser.ts` — implementar de verdad: extraer secciones (datos generales, marcas, vuelos, adjuntos). Si la página es compleja, considerar agregar `cheerio` como dep — el parser manual escala mal con DOM anidado.

### 4. Mapear forms de create/update y reemplazar los stub

Workflow:
```ts
// pseudocódigo del flujo write
const formPage = await http.get('/<url-del-form>/', { detectAuthRedirect: true });
const forms = parseForms(String(formPage.data));
const target = forms.find(f => f.action === '/<url-de-submit>/'); // o el que tenga el csrf
const body: Record<string, string> = {
  csrfmiddlewaretoken: target.csrfToken!,
  // … campos del DTO mapeados a target.fields[].name
};
const res = await http.postForm(target.action!, body, { detectAuthRedirect: true });
// 302 a /<lista>/ = OK ; 200 con form recargado = errores de validación (parsear errores del HTML)
```

Pasos concretos:
1. Correr `parseForms(html)` (en `parsers/form-fields.parser.ts`) sobre el HTML del form de creación y loggear el resultado.
2. Pegar la lista de fields (name + type + required + options) en este MD como "contrato del form".
3. Definir DTO **tipado** con `class-validator` que mapee 1:1 a esos fields. Reemplazar el `fields: Record<string,string>` de `create-coordinacion.dto.ts` / `update-coordinacion.dto.ts`.
4. En `EbfCoordinacionService.create/update`, reemplazar el `throw NotImplementedException` por: GET form → extraer csrf → POST con datos.
5. Encolar con Bull (`fito-xml` ya existe como ejemplo) si vamos a paralelizar — el portal puede tener race conditions del lado servidor.

### 5. Validación de horarios

Ya está integrada en `create/update` vía `assertCoordinacionWindow()`. Si el portal cambia ventanas, editar `utils/horarios.util.ts:COORDINACION_WINDOWS`.

### 6. Considerar agregar deps (opcional)

Si el HTML del detalle es complejo o los parsers regex empiezan a fallar:
```
npm i cheerio
```
- `tough-cookie` + `axios-cookiejar-support` solo si aparece la necesidad de soportar múltiples dominios o expiración real (improbable).

### 7. Aún sin tocar — decisiones para retomar

- **¿Persistir resultados en PG?** Hoy todo es pasthrough. Cuando se decida side-car (ver [docs/decisions/0001-hybrid-access-postgres.md](../../../../../../docs/decisions/0001-hybrid-access-postgres.md)), crear un schema `prisma/extensions/ebf-portal/` con tablas mirror + `ebfCoordinacionId` indexado.
- **¿Trigger automatizado?** Hoy bajo demanda. Si se quiere cron de pull, sumar `@nestjs/schedule` (ya no agrega complejidad).
- **¿Auditoría?** Hoy logs `[EBF-PORTAL]` por consola. Si los writes son críticos, persistir cada submit (DTO + status + HTML de respuesta) en una tabla `ebf_portal_audit`.

## Arquitectura del módulo (referencia rápida)

```
src/modules/integrations/ebf-portal/
├── ebf-portal.module.ts            # wiring
├── ebf-portal.controller.ts        # endpoints v1: /api/v1/integrations/ebf-portal/*
├── ebf-portal.service.ts           # facade (orquesta auth + delega en services)
├── config/ebf-portal.config.ts     # env vars tipadas (registerAs 'ebfPortal')
├── http/
│   ├── cookie-jar.ts               # jar minimal name→value
│   └── ebf-http.client.ts          # axios + jar + Referer auto + 302→login detection
├── auth/
│   └── ebf-auth.service.ts         # ensureSession() + forceRelogin() concurrent-safe
├── services/
│   ├── coordinacion.service.ts     # list / detail (raw) / create (stub) / update (stub)
│   └── dae.service.ts              # list (columnas dinámicas)
├── parsers/
│   ├── csrf.parser.ts              # csrfmiddlewaretoken del HTML
│   ├── coordinacion-list.parser.ts # tabla SSR → 15 columnas + paginación
│   ├── coordinacion-detail.parser.ts  # PLACEHOLDER
│   └── form-fields.parser.ts       # introspección genérica de <form>
├── utils/
│   └── horarios.util.ts            # ventanas + isWithinWindow(tz='America/Guayaquil')
├── types/
│   ├── coordinacion.types.ts
│   └── dae.types.ts
└── dto/
    ├── create-coordinacion.dto.ts  # STUB (fields: Record<string,string>)
    └── update-coordinacion.dto.ts  # STUB
```

**Regla de oro:** ninguna lógica de scraping/POST fuera de `services/` y `parsers/`. El `controller` solo enruta, el `facade` solo delega. Si un archivo supera ~250 líneas, partirlo.
