# Operación (reemplazo del sistema viejo)

Lógica de negocio de SE2Guias (VB6 + Access) re-implementada en NestJS, por rebanadas verticales
(API + pantalla en `experts-front-core/src/features/operacion`). Contexto: [ADR 0003](../../../../../../docs/decisions/0003-replicar-legacy-datos-maestros.md).

Los datos del sistema viejo llegan por el sync ([sync/legacy-access](../sync/legacy-access/README.md)) al schema
`documentos`; los nombres se resuelven en `datos_maestros`.

## Modo sombra

Mientras se usen los dos sistemas, `OPERACION_MODO=sombra` (default):

- El sistema nuevo **solo modifica lo que creó** (`codigoAccess = null`); lo que viene de Access se ve pero no se
  toca (403).
- Las guías hijas nuevas se numeran desde 90.000.000 (`OPERACION_NGH_INICIO`) para no chocar con el contador de
  Access. Contadores en la tabla `Contador` (atómicos).

`OPERACION_MODO=activo` el día del corte definitivo.

## Rebanadas

| Rebanada | API | Pantalla |
|---|---|---|
| Coordinaciones: lista, búsqueda (AWB, guía hija, DAE, N°), detalle | `GET /operacion/coordinaciones[/:id]` | `/operacion/coordinaciones` |
| Coordinar: simular, crear, editar (guía madre + cobro al cliente), cortar, anular | `POST simular`, `POST`, `PUT :id`, `POST :id/corte`, `DELETE :id` | `/operacion/coordinaciones/nueva`, `…/:id/editar` |
| Defaults para coordinar (parámetros de línea, rótulos de agencia, conceptos de aerolínea) | `GET /operacion/coordinaciones/parametros?idAerolinea=` | — |
| Buscadores (solo activos) y sugerencias de la marca | `GET /operacion/opciones/:tipo`, `GET /operacion/opciones/consignatarios/:id/sugerencia` | — |
| Stock de guías AWB: lotes (dígito verificador mod 7), préstamo, devolución | `/operacion/guias-madre/*` | `/operacion/guias` |
| Validación contra Access | `GET /operacion/validacion`, `GET /operacion/coordinaciones/:id/validacion` | `/operacion/validacion` |
| Datos maestros (solo lectura) | `GET /maestros/*` | `/maestros` |

## Reglas y validación

Las fórmulas viven en [`calculos/`](calculos/) y cada una tiene una `ReglaNegocio` en
[`calculos/reglas/`](calculos/reglas/) que se evalúa sobre **todas** las coordinaciones sincronizadas comparando lo
que calcula el sistema nuevo con lo que guardó Access. La ingeniería inversa (con SQL de validación y tasas de
coincidencia) está en `legacy-analysis/reglas/liquidacion.md` (fuera del repo).

Liquidación (R1–R6). Cada guía tiene lo que cobra la aerolínea (va en la **guía madre**, que es su factura;
Access: juego normal) y, casi siempre, lo que se **cobra al cliente** (Access: "corte extra", campos `*_ex`). Hoy
no hay comisión: la ganancia es la diferencia (p. ej. la aerolínea da 3,00 el kilo y al cliente se le cobra 3,30).
El peso cobrable lo da la aerolínea (peso por volumen); el handling al cliente sale de la ficha del cliente.
El cobro al cliente no tiene fórmula (precios "al ojo"): se propone el de la última guía de la misma marca. Acierto
medido 2020–2023: Form A 98 %, Fitos 96 %, Mca 94 %, Tax/Termógrafo 98–99 %, tarifa ~80 %, Transport 41 %.

```
juego vigente  = cobro al cliente si la guía lo tiene, si no la guía madre
flete          = round2(peso cobrable × tarifa)
due carrier    = guía aérea + combustible + seguridad + otros + aux1 + aux2 + cálculo aux.   (Access: docDA)
due agent      = Σ 7 códigos de agencia (Form A, Transport, PCA, Termógrafo, MCA, Tax, Fitos) (Access: docDC)
total          = flete + due carrier + IVA + due agent
```

Ojo: en Access `docDA` guarda los cargos de **aerolínea** y `docDC` los de **agencia** (al revés de lo que sugieren
los nombres). El handling de Experts al cliente (`aux3Handling`) **no** suma al total de la guía.

Otras reglas: totales = suma de líneas; volumen = Σ round2(L×A×H×fulls/6000); una guía hija por
marca + finca + producto (`parNGHxProducto`); peso cobrable ≥ peso bruto (solo juego normal); DAE obligatoria por
línea.
