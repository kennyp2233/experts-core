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
| Ingreso de guías (documento CGU): lista, detalle, grabar, modificar, anular | `/operacion/guias-madre/ingresos[/:id]` | `/operacion/guias/ingresos` |
| Administración de guías: préstamo, quitar préstamo, devolución, verificar estado | `/operacion/guias-madre[/:id/…]` | `/operacion/guias/administracion` |
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

Segunda revisión (16/10/2026, layout de `frmPIN_Coordina` reconstruido del binario y datos de 2025–2026): el detalle
es "detalle coordinado", una fila por línea en el orden Fulls → Cajas → Kg → DAE, con nota (una fila en 0 con nota es
una novedad: "no llegó 1.5", "va a KAM"), factura y quién la registró, que se conserva al modificar; la cabecera va
Consignatario → Aerolínea → Guía (se propone su primera guía libre) → Fecha; la nota (termógrafo) a la vista; la lista
es el "día de vuelo" (Todas / Por cortar / Cortadas, un día con Hoy y Mañana, totales del filtro al pie);
"Ingreso peso neto" reparte el peso de la báscula entre las filas. En Access `docEstado` 1 = no cortada, 2 = cortada,
0 = anulada: el dueño corta apenas completa la guía, así que "Por cortar" casi siempre está vacía.

Tercera revisión (16/10/2026, la ventana vieja dibujada con `legacy-analysis/tools/vb6render.py` y comparada con los
mismos datos, p. ej. la 13909 y el vuelo del 13/10/2026):

- **Detalle = documento viejo**: arriba la cabecera completa como ficha (Consignatario · Embarcador · Aerolínea ·
  Número guía · Tipo de embarque · Referencia | Agencia IATA · Destino · Fecha de vuelo · Manifiesto · Peso cobrable ·
  Pago) y la nota al pie; pestañas en el orden del viejo: Detalle de coordinación · Valores · Ruta, vuelos y
  manifiesto (una sola, como la vieja) · Guías hijas · Más datos. Anterior / siguiente entre las guías del mismo vuelo.
- **Detalle de coordinación** con las columnas de la grilla vieja en su orden (Finca · Producto · Fulls · Cajas · Kg ·
  DAE · Fecha · Guía hija · Factura · Valor · Tallos · Nota · Usuario), compacta para que entre en 1366 px; los
  usuarios web de las fincas en azul; en las novedades no se muestran los "0" que el viejo guarda en DAE y factura.
- **Lista** con las columnas de la vieja: N° · Guía · Estado · (Fecha) · Aerolínea por su nombre · Consignatario ·
  Cliente · Manifiesto · Nota · Fulls · Cajas · Kg · Peso cobrable. El peso cobrable es el de la aerolínea (la
  columna "VOL." = `extCWeight`), no el que se le cobra al cliente.
- **Reportes del día** (los dos botones de la lista vieja), `GET coordinaciones/reportes/{programacion|antinarcoticos}
  ?dia=`: "Programación de vuelo" (por guía: fulls, peso, peso cobrable y promedios por full; `repProg.xlt`) y
  "Reporte antinarcóticos" (una fila por finca de cada guía, para la Policía; `repAntinarcoticosN.xlt`; como el viejo,
  PIEZAS = cajas y CAJAS = fulls, sin las líneas de novedad; conductor, cédula y placa a mano). Verificado contra
  Access el 13/10/2026: 43 filas, 89 cajas, 40 fulls, $ 8.263,55.
- El menú lateral se pliega solo en las pantallas de coordinaciones (lista, ver, coordinar) si el usuario no eligió.

Pendiente:

- **Las fincas cargan su detalle por la web** (74 % de las líneas desde 2025, `detOrigen = 'E'`, 56 fincas activas
  este mes): la web escribe en Access. Antes de `OPERACION_MODO=activo` hay que decidir cómo cargan en el sistema
  nuevo (portal propio, o leer lo que la web deja en Access y sumarlo como líneas `origen = 'E'`). Mientras tanto,
  "Nueva coordinación" lo avisa.
- **DAE desde el registro de DAEs** (F2 del viejo): sincronizar `awbm_auxdaes` (finca, origen, país, vigencia, estado;
  ~10.000 activas) y proponer la vigente al elegir la finca; ofrecer actualizarlas si cambia la fecha o el destino.
- Transferir cajas entre guías o marcas (`frmPINTransferWizard`) y "Coordinación múltiple" (cargar una finca en varias
  guías sin abrirlas). Numeración de las coordinaciones nuevas después de la última del viejo al pasar a modo activo.
- **Teclado** (en el viejo, Enter = siguiente campo en todas las pantallas: `SAC2inv.Proc_64FB10` → `SendKeys "{TAB}"`):
  - Enter que avance de campo en coordinar, ingreso de guías y préstamo.
  - Foco inicial en la guía madre (nueva), en el buscador de la lista y del stock, y en la aerolínea del ingreso.
  - En los buscadores, escribir y salir con Tab borra lo escrito: falta `autoHighlight` + `autoSelect` en `OpcionAutocomplete`.
  - Atajos: Ctrl+S / Alt+G = Grabar, F3 = Recalcular, F2 en la DAE = copiar la de la fila anterior, Enter en la última
    fila = agregar finca, y que el Tab salte los valores sugeridos.
- **Imprimir** guía madre, HAWB y manifiesto al cortar (el viejo lo hacía; faltan los formatos del dueño).
- **"Ganancia"** = total al cliente − total guía madre: incluye los cargos de agencia (Transport, Fitos, Form A).
  Confirmar con el dueño si así la mide o si debe ser solo la diferencia de tarifa.
- El viejo abría en el último documento y navegaba Primero/Anterior/Siguiente/Último por N°; el nuevo navega
  dentro del vuelo. Los combos de aerolínea y cliente de la lista vieja solo ofrecían los del día.
- El aviso de "salir sin grabar" cubre los enlaces y cerrar la pestaña, no el botón Atrás del navegador.
- Datos: MARTINAIR está dos veces en las aerolíneas; hay 3 guías COORDINADAS sin coordinación (salen primero al
  filtrar Coordinadas).

## Guías: Ingreso y Administración

Como el menú Guías del sistema viejo (análisis 16/10/2026 con datos de producción). **Cada guía nace en un Ingreso de
guías** (documento `CGU`, `frmPIN_CoorGuias`, impreso "INGRESO DE GUIAS"): número (`CGU-0003871`), fecha, aerolínea
(prefijo y tipo de stock por defecto, `aerVirtual`), referencia = **agencia IATA con que se reservó la guía** (EBF,
FlowerCargo, Sierra), tipo de stock (normal / virtual) y sus guías. El 100 % de las coordinaciones 2019–2026 toman su
guía de un CGU. Uso real del último año: 367 ingresos, casi siempre **una guía virtual escrita a mano**; 23 % se anulan
(la aerolínea cambió el número: se ingresa la nueva, se cambia en la coordinación y se anula el ingreso viejo); 1 de cada
4 guías termina "prestada" (la usó EBF/FlowerCargo o no se usó), casi sin observación; devoluciones: ninguna desde 2015.

- Estado del ingreso (`estado-ingreso.ts`, regla confirmada con los documentos 2019–2026): **Cancelado** = todas sus
  guías usadas (coordinadas, o prestadas y devueltas) — es "agotado", no "anulado"; **Guías coordinadas** = alguna
  coordinada sin estar todas usadas; **Ingresado** = ninguna coordinada. Se recalcula al ingresar, modificar,
  coordinar / cambiar guía / anular coordinación, prestar, quitar préstamo, devolver y verificar. "Stock verificado" =
  el estado guardado coincide con sus guías (si no, "Corregir").
- Reglas del viejo: guía de 8 dígitos con verificador serial mod 7; única en todo el stock (también se consulta el
  sistema viejo en vivo, solo lectura, por lo que el sync aún no trajo); una guía usada no se quita; un ingreso
  cancelado no se modifica; no se anula con guías usadas; no se cambia la aerolínea con guías usadas.
- Modo sombra: los ingresos nuevos se numeran desde `CGU-0900000` (`OPERACION_CGU_INICIO`); al coordinar solo se ofrecen
  guías libres de ingresos nuevos (virtuales primero, por número; normales por fecha de ingreso). Aviso si la agencia
  IATA de la coordinación no es la del ingreso (regla de la "Asignación" del viejo).
- Sync: la cabecera trae aerolínea (`docExtra`), tipo de stock (`docCert`) y la agencia IATA (por dígitos de
  `docRefer`); una guía que el viejo borra (anuló o modificó su ingreso) queda **ANULADA**; si una guía del viejo ya
  está en un ingreso nuevo no se muda: queda como error del sync (se cargó en los dos).
- No se migra: Asignación (sin uso), Certificación, Facturación, Pagos y Facturación AWBs (muertos desde 2012–2015).
- Pendiente (preguntar al dueño): botón "Reemplazar guía" (ingreso nuevo + cambio en la coordinación + anular el viejo,
  ~70 veces al año); si la referencia (agencia IATA) debe ser obligatoria; impresión del ingreso (no se usa desde 2022).

## Archivo FlowerCargo

[`documentos/flowercargo.ts`](documentos/flowercargo.ts). Mismas 71 columnas del archivo que manda FlowerCargo; con la
guía 369-8469 5461 coinciden 61 columnas en las 15 filas. Las que cambian son a propósito (respuestas del dueño,
2026-10-16): nuestros números de guía hija (columna T), nuestro peso, el consignee de la marca (datos ECUAPASS de la
guía hija), la dirección de la finca y el destino final (lo que importa es el país). Fincas con el mismo RUC van en una
sola fila (Utopía: FYC, Chivan, Santa Marta…), con la guía hija de más piezas; el RUC se compara solo por dígitos
porque en el sistema viejo lleva puntos al final para no repetirse. Salida en ASCII, tabs y CRLF: editar el txt a mano
lo rompía. OCE del consolidador: `FLOWERCARGO_OCE` (default 23901050).
