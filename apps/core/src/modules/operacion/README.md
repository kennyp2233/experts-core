# Operación (reemplazo del sistema viejo)

Lógica de negocio de SE2Guias (VB6 + Access) re-implementada en NestJS, por rebanadas verticales
(API + pantalla en `experts-front-core/src/features/operacion`). Contexto: [ADR 0003](../../../../../../docs/decisions/0003-replicar-legacy-datos-maestros.md).

Los datos del sistema viejo llegan por el sync ([sync/legacy-access](../sync/legacy-access/README.md)) al schema
`documentos`; los nombres se resuelven en `datos_maestros`.

## Modo sombra

Mientras se usen los dos sistemas, `OPERACION_MODO=sombra` (default):

- El sistema nuevo **solo modifica lo que creó** (`codigoAccess = null`); lo que viene de Access se ve pero no se
  toca (403).
- Las guías hijas nuevas se numeran desde 90.000.000 (`OPERACION_NGH_INICIO`), las coordinaciones desde 900.000
  (`OPERACION_COO_INICIO`, campo `numero`; las de Access usan `codigoAccess`) y los ingresos desde CGU-0900000, para no
  chocar con los contadores de Access. Contadores en la tabla `Contador` (atómicos).

`OPERACION_MODO=activo` el día del corte definitivo. **Corte definitivo** (`GET /operacion/corte-definitivo`, ADMIN,
pantalla `/operacion/corte-definitivo`): muestra los contadores contra los últimos números de Access y los pasos. En
modo activo, `POST …/alinear-contadores` deja cada contador en el último número de Access (coordinación
`MAX(docNumero)` COO, CGU, y guía hija = `eBodega.bodNGH` / mayor `detGuiaHija` reciente), así la numeración sigue la
del viejo. En modo activo el sync Access → PG no corre (ni el cron ni a mano, salvo dry-run).

## Rebanadas

| Rebanada | API | Pantalla |
|---|---|---|
| Coordinaciones: lista, búsqueda (AWB, guía hija, DAE, N°), detalle | `GET /operacion/coordinaciones[/:id]` | `/operacion/coordinaciones` |
| Coordinar: simular, crear, editar (guía madre + cobro al cliente), cortar, anular | `POST simular`, `POST`, `PUT :id`, `POST :id/corte`, `DELETE :id` | `/operacion/coordinaciones/nueva`, `…/:id/editar` |
| Reabrir una guía cortada (deshacer el corte; no borra nada, vuelve al portal de fincas) | `DELETE /operacion/coordinaciones/:id/corte?motivo=` | detalle → ⋯ → "Reabrir guía" |
| Defaults para coordinar (parámetros de línea, rótulos de agencia, conceptos de aerolínea) | `GET /operacion/coordinaciones/parametros?idAerolinea=` | — |
| Buscadores (solo activos) y sugerencias de la marca | `GET /operacion/opciones/:tipo`, `GET /operacion/opciones/consignatarios/:id/sugerencia` | — |
| Ingreso de guías (documento CGU): lista, detalle, grabar, modificar, anular | `/operacion/guias-madre/ingresos[/:id]` | `/operacion/guias/ingresos` |
| Administración de guías: préstamo, quitar préstamo, devolución, verificar estado | `/operacion/guias-madre[/:id/…]` | `/operacion/guias/administracion` |
| Archivo de manifiesto para FlowerCargo (txt por tabs, una fila por RUC de finca) | `GET /operacion/coordinaciones/:id/flowercargo[.txt]` | botón "FlowerCargo" en el detalle |
| Portal de fincas: guías abiertas, cargar / corregir / borrar su detalle, sus DAE | `/portal-fincas/*` (rol `FINCA`) | `/portal` |
| Usuarios de fincas (crear, fincas que ve, desactivar, nueva clave) | `/operacion/usuarios-fincas` (rol `ADMIN`) | `/operacion/usuarios-fincas` |
| Imprimir guías hijas por finca (HAWB en hoja blanca A4) | `GET /operacion/coordinaciones/:id/guias-hijas/impresion[?guiaHija=]` | `/imprimir/coordinaciones/:id/guias-hijas` |
| Validación contra Access | `GET /operacion/validacion`, `GET /operacion/coordinaciones/:id/validacion` | `/operacion/validacion` |
| Correcciones después del corte: factura y nota de cada línea, nota de la guía | `PATCH /operacion/coordinaciones/:id` | detalle → "Facturas y notas" |
| Pasar cajas (líneas) a otra guía abierta, las dos se recalculan | `POST /operacion/coordinaciones/:id/transferir` | detalle → ⋯ → "Pasar cajas a otra guía" |
| Anuladas: qué, quién, cuándo y motivo | `DELETE /operacion/coordinaciones/:id?motivo=`, `GET …/anuladas` | lista → pestaña "Anuladas" |
| Estado de cuenta por cliente (quincena / rango), Excel | `GET /operacion/cuentas/estado-cuenta[.xlsx]` | `/operacion/cuentas/estado-cuenta` |
| Ventas y liquidación: costo aerolínea vs. cobrado, ganancia, por aerolínea y cliente | `GET /operacion/cuentas/ventas[.xlsx]` | `/operacion/cuentas/ventas` |
| Liquidación de una guía al cliente (reemplaza al Shipment-Invoice) | `GET /operacion/cuentas/guias/:id` | Imprimir → "Liquidación al cliente" |
| DAEs desde la oficina (F4 "Actualizar FUE" del viejo) | `GET/POST/DELETE /operacion/daes` | `/operacion/daes` |
| Portal de clientes: sus guías, guías hijas, liquidación y estado de cuenta | `/portal-clientes/*` (rol `CLIENTE`) | `/portal-clientes` |
| Usuarios de clientes | `/operacion/usuarios-clientes` (rol `ADMIN`) | `/operacion/usuarios-clientes` |
| Corte definitivo: contadores vs. Access y pasos | `/operacion/corte-definitivo` (rol `ADMIN`) | `/operacion/corte-definitivo` |
| Datos maestros: lista, ficha, alta y cambios (fincas, consignatarios, embarcadores, clientes, productos, aerolíneas, agencias, subagencias, destinos, países, tipos de embarque, choferes) | `GET /maestros[/:entidad[/:id[/edicion]]]`, `GET /maestros/:entidad/formulario`, `POST /maestros/:entidad`, `PUT /maestros/:entidad/:id` | `/maestros` |

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

- ~~Las fincas cargan su detalle por la web~~ (portal propio, 17/10/2026; ver [Portal de fincas](#portal-de-fincas)).
  Falta confirmar con el dueño usuarios y claves, hora límite, avisos y los kg por caja (22 en la web vieja).
- ~~DAE desde el registro de DAEs~~ (hecho 16/10/2026): `awbm_auxdaes` se sincroniza a `DaeFinca` y al coordinar se
  propone la vigente al elegir la finca (`GET opciones/daes`, regla de `ITSSystem.Proc_6733B0`: finca + origen + país
  del destino final + fecha de vuelo dentro del período, activas, la que empezó antes). Coincide con la DAE real en el
  96 % de las líneas con carga de 2026 (2.332 de 2.424) y en las 28 de la 13909. En cursiva mientras es propuesta;
  si cambia la fecha o el destino se recalcula, y si no hay vigente la fila avisa "Sin DAE vigente para el vuelo".
- ~~Transferir cajas entre guías~~ (hecho 20/10/2026, solo entre guías abiertas). "Coordinación múltiple" no se
  migra (sin uso). ~~Numeración al pasar a modo activo~~ (corte definitivo, 20/10/2026).
- Otras reglas del viejo agregadas el 20/10/2026: al cambiar la marca se conservan los números de guía hija (misma
  finca + producto); factura vacía = número de guía hija; comisión = la de la agencia IATA; quién y cuándo creó /
  modificó; ruta editable por guía (5 % de las guías vuela distinto de la ruta del maestro) y el manifiesto es del
  transportista del tramo VIA (MSC/CP volado por 5Y).
- Sin migrar, a confirmar con el dueño si se usan: envío del manifiesto a ECUAPASS (XML 029/034 y respuestas; hoy
  manifiesto y secuencial se escriben a mano), impresos de FITO y Forma A, Reservas por aerolínea, Export List,
  Etiquetas, Programación detallada por finca, Guías hijas por cliente, Factura comercial, ETD/ATD y confirmación de
  vuelos.
- **Teclado** (en el viejo, Enter = siguiente campo en todas las pantallas: `SAC2inv.Proc_64FB10` → `SendKeys "{TAB}"`):
  - Enter que avance de campo en coordinar, ingreso de guías y préstamo.
  - Foco inicial en la guía madre (nueva), en el buscador de la lista y del stock, y en la aerolínea del ingreso.
  - En los buscadores, escribir y salir con Tab borra lo escrito: falta `autoHighlight` + `autoSelect` en `OpcionAutocomplete`.
  - Atajos: Ctrl+S / Alt+G = Grabar, F3 = Recalcular, F2 en la DAE = copiar la de la fila anterior, Enter en la última
    fila = agregar finca, y que el Tab salte los valores sugeridos.
- **Imprimir**: guía madre (hoja blanca o papel de guía calibrable), guías hijas por finca y manifiesto ya se imprimen
  (ver [Impresión](#impresión)); faltan las respuestas del dueño (papel, impresora, qué tarifa va, quién firma).
- **"Ganancia"** = total al cliente − total guía madre: incluye los cargos de agencia (Transport, Fitos, Form A).
  Confirmar con el dueño si así la mide o si debe ser solo la diferencia de tarifa.
- El viejo abría en el último documento y navegaba Primero/Anterior/Siguiente/Último por N°; el nuevo navega
  dentro del vuelo. Los combos de aerolínea y cliente de la lista vieja solo ofrecían los del día.
- El aviso de "salir sin grabar" cubre los enlaces y cerrar la pestaña, no el botón Atrás del navegador.
- Datos: MARTINAIR está dos veces en las aerolíneas; hay 3 guías COORDINADAS sin coordinación (salen primero al
  filtrar Coordinadas).

## Cobro al cliente (estado de cuenta, ventas, liquidación)

[`documentos/cuentas.service.ts`](documentos/cuentas.service.ts). Análisis del 20/10/2026 (`legacy-analysis`, vistas
`tv_*` de Access y plantillas): los documentos de cobro del viejo salían incompletos y se corregían a mano en Excel.

- Los "valores extra" son dos cosas: el **corte extra** (`*_ex`, lo que se cobra al cliente: tarifa, peso y los 7
  códigos de agencia; 99,5 % de las guías 2024–2026) y el **handling de Experts** (`extAux3Handling`, 60 u 85 por
  guía), que el viejo guarda **solo en el juego normal** (`_ex` = 0 en el 100 % de 2025+).
- Viejo: el estado de cuenta (`tv_repEstadoCuentaCliente`) usaba el corte extra pero ponía `0 AS extAux3Handling` y el
  peso cobrable del juego normal; la liquidación general, las ventas, el estado de cuenta "antiguo" y el
  Shipment-Invoice usaban el juego normal (costos); la guía madre y las guías hijas por cliente dependían de marcar
  "Imprimir CORTE EXTRA". En 2026 un documento con el juego normal queda 17 % por debajo, sin contar el handling.
- Nuevo: el cobro al cliente sale siempre del juego vigente (corte extra si lo hay) con su propio peso cobrable, y el
  handling va como renglón aparte: total a cobrar = total de la guía + handling. Solo guías cortadas (salvo
  `incluirAbiertas`). Ventas: ganancia = total cobrado − total de la guía madre. Verificado con la 13910: 1.325,20 +
  60 = 1.385,20 (costo 1.026,50, ganancia 358,70).
- La guía madre sigue con los valores de la aerolínea por defecto (es su factura); "cliente" a pedido.

## Portal de clientes

Rol `CLIENTE` (antes solo podía entrar a la cuenta de Experts en el portal de EBF: se le quitó). Usuarios en
`UsuarioCliente` (n:m con `Cliente` de datos maestros: el cliente de la marca). Ve las guías de sus marcas (también las
del sistema viejo, solo lectura), el vuelo, sus guías hijas por finca (con DAE y facturas) e imprimirlas, la
liquidación de cada guía cortada y su estado de cuenta (Excel). Nunca ve los valores de la aerolínea ni guías de otros
clientes; la API de oficina le responde 403.

## Guías: Ingreso y Administración

Como el menú Guías del sistema viejo (análisis 16/10/2026 con datos de producción). **Cada guía nace en un Ingreso de
guías** (documento `CGU`, `frmPIN_CoorGuias`, impreso "INGRESO DE GUIAS"): número (`CGU-0003871`), fecha, aerolínea
(prefijo y tipo de stock por defecto, `aerVirtual`), referencia = **agencia IATA con que se reservó la guía** (EBF,
FlowerCargo, Sierra), tipo de stock (normal / virtual) y sus guías. El 100 % de las coordinaciones 2019–2026 toman su
guía de un CGU. Uso real del último año: 367 ingresos, casi siempre **una guía virtual escrita a mano**; 23 % se anulan
(la aerolínea cambió el número: se ingresa la nueva, se cambia en la coordinación y se anula el ingreso viejo); 1 de cada
4 guías termina "prestada" (la usó EBF/FlowerCargo o no se usó), casi sin observación; devoluciones: ninguna desde 2015.

- Estado del ingreso (`estado-ingreso.ts`, regla confirmada con los documentos 2019–2026): **Usado** (en el viejo y en
  la base, `CANCELADO`; el dueño pidió "usada", 19/10/2026) = todas sus guías usadas (coordinadas, o prestadas y
  devueltas) — es "agotado", no "anulado"; **Guías coordinadas** = alguna
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
- Pantallas (16/10/2026, comparadas con `frmPIN_CoorGuias` dibujada con `legacy-analysis/tools/vb6render.py`): la lista
  tiene las columnas del viejo (Doc. · Fecha · Aerolínea por su nombre · Referencia · Tipo Stock · Estado), con la
  guía, su situación y la coordinación en una línea (96 % de los ingresos traen una sola), con filas compactas. El
  documento lleva la cabecera como ficha en el orden del viejo (Fecha · Aerolínea · Referencia = agencia y su código
  IATA · Tipo de stock | Stock verificado · registrado · modificado). Debajo, el resumen "Total guías · Coordinadas ·
  Préstamos · Devoluciones · Libres" y la grilla "Secuencia de guías" (Número · Situación · Coordinación · Préstamo ·
  Observaciones · Devolución). Tiene anterior / siguiente por N°, sin los anulados, como el viejo.
- No se migra: Asignación (sin uso), Certificación, Facturación, Pagos y Facturación AWBs (muertos desde 2012–2015).
- Pendiente (preguntar al dueño): botón "Reemplazar guía" (ingreso nuevo + cambio en la coordinación + anular el viejo,
  ~70 veces al año); si la referencia (agencia IATA) debe ser obligatoria; impresión del ingreso (no se usa desde 2022).

## Datos maestros

Se editan en `/maestros` (17/10/2026), para poder apagar el sistema viejo: en el último año aparecieron 31 fincas nuevas
y las aerolíneas cambian tarifas y cargos.

- **Un formulario por entidad** en [`maestros/formularios-maestros.ts`](maestros/formularios-maestros.ts): secciones,
  campos (texto, párrafo, número, sí/no, opciones, tabla hija), obligatorios, ayudas y de dónde salen las opciones. El
  front dibuja con él la ficha de lectura y el formulario; un campo nuevo se agrega solo ahí. Lo que no está en el
  formulario no se toca (p. ej. los datos de transmisión LAN del consignatario, muertos desde 2009).
- [`EdicionMaestrosService`](maestros/edicion-maestros.service.ts) valida igual que el front (obligatorios, números con
  coma, largos, que lo elegido exista) y devuelve los errores por campo (`errores` en la respuesta 400); guarda en
  mayúsculas lo que se imprime, una línea por renglón en direcciones y consignee, subtablas 1:1 con upsert
  (`guiaM.guiaMNotify`) y tablas hijas reemplazadas enteras (productos de la finca, cargos de la aerolínea).
- **Modo sombra**: lo que vino del sistema viejo (registrado en `SyncLegacyRegistro`, o con `codigoAccess`) se ve pero no
  se cambia (403): se cambia allá y llega por el sync. Lo creado aquí sí, y la lista lo marca "Creado aquí". Los
  códigos que también son llave del sync (producto, destino, país, tipo de embarque) se ponen al crear y no se cambian
  después. Ojo: si en el sistema viejo se crea después el mismo código, el sync toma el registro de aquí.
- Nada se borra: se desactiva (deja de ofrecerse al coordinar), como en el sistema viejo y en el sync.
- No se editan todavía: parámetros, medidas, orígenes, aranceles y productos compuestos, DAEs desde la oficina (las
  fincas registran las suyas en el portal), choferes por finca.

## Portal de fincas

Reemplazo de la web de fincas del sistema viejo (`WEB_sisUsuarios` / `WEB_sisFincas`; carga el 74 % de las líneas,
`detOrigen = 'E'`). Análisis: `legacy-analysis/` (web de fincas, 17/10/2026).

- **Usuarios**: rol `FINCA` en la tabla de usuarios, con las fincas que ve en `UsuarioFinca` (n:m, como
  `WEB_sisFincas`). Los crea un ADMIN en "Usuarios de fincas" con una clave aleatoria de 8 caracteres que se le pasa a la
  finca (bcrypt; la web vieja guardaba claves de 6 en texto plano, no se migran). Desactivar = no entra más.
- **Guías abiertas**: coordinaciones en Borrador con fecha de vuelo de hoy en adelante (hora de Ecuador); en modo
  sombra solo las del sistema nuevo. La oficina puede grabar **solo la cabecera** (sin líneas) mientras está en
  Borrador para que las fincas carguen; al cortar se exige detalle.
- **Cargar**: la finca agrega, corrige o borra **solo sus líneas** (`origen = 'E'`; las de la oficina las ve pero no
  las toca). La DAE se propone del registro (misma regla que al coordinar); el peso por defecto = cajas × `kgPorCaja`.
  Cada cambio pasa por `CoordinarService.actualizar` (mismos cálculos, guías hijas y validaciones que la oficina).
- **Concurrencia**: el detalle trae `version` (`updatedAt`) y al grabar la oficina lo devuelve; si una finca cargó
  entre medio, 409 "La coordinación cambió mientras la editabas" en vez de pisar su carga.
- **Mis DAE**: la finca registra sus DAE (país, desde, hasta) en `DaeFinca` con `codigoAccess = null`; solo puede
  quitar las que registró ahí. Las del sistema viejo llegan por el sync y no se tocan.
- La API de oficina responde 403 al rol `FINCA` (además de `RolesGuard` en los controladores de guía madre y EBF, que
  no lo tenían) y el front la manda a `/portal`.

## Impresión

Guías hijas por finca (`documentos/impresion.service.ts`), como "Guías Hija por Finca" del viejo (`repCoordina2.rpt`):
una House Air Waybill por guía hija en hoja blanca A4, con la finca como shipper (RUC, dirección, teléfono, ciudad),
el consignee y notify de la guía hija de la marca (`ConsignatarioGuiaH`), Experts como agente emisor (parámetros
`EMPRESA.*`), ruta y aerolínea, pago PP/CC, DAE, fulls y manifiesto en "Handling Information", y "AS AGREED". Se
imprime desde el navegador (botón "Imprimir" del detalle → "Guías hijas por finca"; Ctrl+P). Verificado con la 13909:
27 hojas.

**Guía madre** (`GET coordinaciones/:id/guia-madre/impresion?valores=aerolinea|cliente`, `ImpresionService.guiaMadre`),
como "Guía Madre" del viejo (`Proc_732F70` llenando la `GM*.xlt` de la aerolínea). El back arma todo formateado:
número (prefijo / resto como `MID(1,3)` / `MID(4,10)`), shipper = cliente de la marca (`Embarcador`), consignee y
notify de la guía madre (`ConsignatarioGuiaM`), agente IATA (`AgenciaIata.*Carrier`), aeropuertos, ruta `UIO/AMS//`,
piezas/kilos/fulls, peso cobrable × tarifa, naturaleza (`TipoEmbarque.descripcionGuia`), fincas `"1,50=ALIAS"` (fulls
por finca de toda la guía, por alias), cargos de aerolínea con sus rótulos (`ConceptoCosto.abreviatura`), códigos de
agencia (`PARAMETROS.CODAGE*`) y totales (`resumirLiquidacion`). `valores=cliente` usa el juego CORTE_EXTRA (lo que se
le cobra al cliente) si la coordinación tiene cobro al cliente. Se imprime antes del corte ("Pre-corte") y después.
El front (`/imprimir/coordinaciones/:id/guia-madre`) tiene dos formatos:
- **Hoja blanca**: formulario IATA completo dibujado (cabe en A4 y carta).
- **Papel de guía**: solo los datos, en las posiciones en mm sacadas de `GMATLAS VIRTUAL.xlt` (la geometría de casi
  todas) o de `GMTurkishVirtual.xlt` (si la plantilla dice "Turkish"), con los textos fijos de la plantilla y el
  cuadro de la aerolínea de las plantillas "Virtual" (guía neutra). Papel, corrimiento X/Y, firma y cuadro se
  **calibran por aerolínea en el navegador** (`localStorage`, clave = `plantillaGuiaMadre`), con cuadrícula de 10 mm.

Pendiente de confirmar con el dueño: si imprime en papel preimpreso o en hoja blanca, qué papel trae cada aerolínea y
en qué impresora; qué tarifa va en la guía madre (la de la aerolínea o la del cliente); quién firma hoy (las
plantillas traen MAURICIO PINCHAO o JAVIER BUSTOS); si el total debe llevar los cargos de agencia (como el viejo, por
defecto no: total = flete + cargos de aerolínea + IVA, 3.973,00 en la 13909; con "Códigos de agencia" se imprimen los
códigos, "Total Other Charges Due Agent" y el total con ellos). Si el papel de guía se usa en varias PC, pasar la
calibración a PG (side-car por aerolínea).

**Manifiesto** (`/imprimir/coordinaciones/:id/manifiesto`, con los datos de `guias-hijas/impresion`): "CONSOLIDATED
CARGO MANIFEST" en A4 horizontal, cabecera (MAWB, aerolínea, vuelo/fecha, ruta, consolidador, consignee de la guía
madre, manifiesto CAE) y una fila por guía hija (HAWB, finca + RUC, consignee, piezas, kilos, fulls, DAE, productos)
con totales; el encabezado de la tabla se repite en cada hoja.

## Archivo FlowerCargo

[`documentos/flowercargo.ts`](documentos/flowercargo.ts). Mismas 71 columnas del archivo que manda FlowerCargo; con la
guía 369-8469 5461 coinciden 61 columnas en las 15 filas. Las que cambian son a propósito (respuestas del dueño,
2026-10-16): nuestros números de guía hija (columna T), nuestro peso, el consignee de la marca (datos ECUAPASS de la
guía hija), la dirección de la finca y el destino final (lo que importa es el país). Fincas con el mismo RUC van en una
sola fila (Utopía: FYC, Chivan, Santa Marta…), con la guía hija de más piezas; el RUC se compara solo por dígitos
porque en el sistema viejo lleva puntos al final para no repetirse. Salida en ASCII, tabs y CRLF: editar el txt a mano
lo rompía. OCE del consolidador: `FLOWERCARGO_OCE` (default 23901050).
