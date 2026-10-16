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
| Archivo de manifiesto para FlowerCargo (txt por tabs, una fila por RUC de finca) | `GET /operacion/coordinaciones/:id/flowercargo[.txt]` | botón "FlowerCargo" en el detalle |
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

## Pantallas: vocabulario y pendientes de UX

Revisión del 16/10/2026 contra los textos del sistema viejo (`legacy-analysis/se2guias/forms`). Se usa el vocabulario
del sistema viejo: Grabar, Modificar, Corte extra, Recalcular, Detalle por finca, guías Libres, stock Normal/Virtual,
Ingreso de guías, Generar secuencia; la guía como `369-8469 5461`; fincas y aerolíneas por su alias (`plaAlias`,
`aerAlias`); el cliente de la marca (el "Embarcador" del viejo) en la lista. "Anular" se queda (el viejo decía
"Eliminar" pero no borraba). La búsqueda de coordinaciones acepta guía con o sin guion, N° (también de las nuevas),
marca, cliente o finca.

Pendiente:

- **Teclado** (en el viejo, Enter = siguiente campo en todas las pantallas: `SAC2inv.Proc_64FB10` → `SendKeys "{TAB}"`):
  - Enter que avance de campo en coordinar, ingreso de guías y préstamo.
  - Foco inicial en la guía madre (nueva), en el buscador de la lista y del stock, y en la aerolínea del ingreso.
  - En los buscadores, escribir y salir con Tab borra lo escrito: falta `autoHighlight` + `autoSelect` en `OpcionAutocomplete`.
  - Atajos: Ctrl+S / Alt+G = Grabar, F3 = Recalcular, F2 en la DAE = copiar la de la fila anterior, Enter en la última
    fila = agregar finca, y que el Tab salte los valores sugeridos.
- **Imprimir** guía madre, HAWB y manifiesto al cortar (el viejo lo hacía; faltan los formatos del dueño).
- **"Ganancia"** = total al cliente − total guía madre: incluye los cargos de agencia (Transport, Fitos, Form A).
  Confirmar con el dueño si así la mide o si debe ser solo la diferencia de tarifa.
- Navegación anterior / siguiente entre coordinaciones (el viejo tenía Primero/Anterior/Siguiente/Último).
- El aviso de "salir sin grabar" cubre los enlaces y cerrar la pestaña, no el botón Atrás del navegador.
- Datos: MARTINAIR está dos veces en las aerolíneas; hay 3 guías COORDINADAS sin coordinación (salen primero al
  filtrar Coordinadas).

## Archivo FlowerCargo

[`documentos/flowercargo.ts`](documentos/flowercargo.ts). Mismas 71 columnas del archivo que manda FlowerCargo; con la
guía 369-8469 5461 coinciden 61 columnas en las 15 filas. Las que cambian son a propósito (respuestas del dueño,
2026-10-16): nuestros números de guía hija (columna T), nuestro peso, el consignee de la marca (datos ECUAPASS de la
guía hija), la dirección de la finca y el destino final (lo que importa es el país). Fincas con el mismo RUC van en una
sola fila (Utopía: FYC, Chivan, Santa Marta…), con la guía hija de más piezas; el RUC se compara solo por dígitos
porque en el sistema viejo lleva puntos al final para no repetirse. Salida en ASCII, tabs y CRLF: editar el txt a mano
lo rompía. OCE del consolidador: `FLOWERCARGO_OCE` (default 23901050).
