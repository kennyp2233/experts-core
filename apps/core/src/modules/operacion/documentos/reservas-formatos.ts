import type { MarginInfo } from 'xlsx';

/**
 * Formatos de la hoja de reservas de cada aerolínea, copiados de las plantillas
 * del sistema viejo (RPT\RESERVAS *.xlt, columna aerPlantillaReservas de la
 * aerolínea). El viejo llenaba "Hoja2" con una fila por guía (marAlias,
 * marConsignee, marPaisSigla, origen, guía, pago, destino, embNombre,
 * marConsigneeData, marNotify, fecha) y la hoja "Reservas" las tomaba con
 * fórmulas; las cajas (fulls) se escribían a mano y el peso salía de
 * multiplicarlas por los kg por full de cada plantilla. Aquí las cajas van con
 * la reserva de la guía (o lo coordinado) y el peso queda como fórmula, para
 * que se pueda corregir en el Excel.
 */

export interface GuiaReserva {
  /** marAlias */
  marca: string;
  /** marConsignee */
  consignee: string;
  /** marPaisSigla ("Código Cliente" en la plantilla) */
  codigoCliente: string;
  origen: string;
  awb: string;
  pago: 'PP' | 'CC';
  destino: string;
  /** embNombre */
  tipoCarga: string;
  /** marConsigneeData, con sus renglones */
  consigneeDatos: string;
  /** Fulls reservados (o coordinados); vacío si no hay. */
  fulls: number | null;
}

export interface DatosReserva {
  aerolinea: string;
  /** Código IATA de la aerolínea (aerPaisSigla). */
  codigo: string;
  /** Número de vuelo, si todas las guías van en el mismo. */
  vuelo: string;
  /** AAAA-MM-DD */
  dia: string;
  agencia: string;
  contacto: string[];
  guias: GuiaReserva[];
}

export interface HojaReserva {
  filas: unknown[][];
  /** null = columna oculta (las plantillas de LAN tienen columnas en 0). */
  anchos: Array<number | null>;
  uniones: string[];
  margenes: MarginInfo;
}

type Formato =
  /** La tabla de Experts (KLM, Atlas, Emirates, Turkish, Qatar…): solo cambian los kg por full y los títulos. */
  | { tipo: 'tabla'; kgPorFull: number; titulos: 'KL' | 'AT'; m3PorKg?: number }
  /** Planilla de LAN Cargo (operaciones comerciales / ventas). */
  | { tipo: 'lan'; kgPorFull: number; remarks: 'marca' | 'consignee' }
  /** "Planilla de reserva flor" de Cargolux (agente general Mawney Associates). */
  | { tipo: 'cv'; kgPorFull: number };

const KL = (kgPorFull: number): Formato => ({ tipo: 'tabla', kgPorFull, titulos: 'KL' });
const AT = (kgPorFull: number): Formato => ({ tipo: 'tabla', kgPorFull, titulos: 'AT' });

/** Por nombre de plantilla (aerPlantillaReservas, en mayúsculas y sin .xlt). */
const FORMATOS: Record<string, Formato> = {
  'RESERVAS KL': KL(46),
  'RESERVAS QR': KL(46),
  'RESERVAS M7': KL(46),
  'RESERVAS ET': KL(46),
  'RESERVAS AT': AT(38),
  'RESERVAS EK': AT(38),
  'RESERVAS TK': KL(29),
  'RESERVAS MP': KL(29),
  'RESERVAS LH': KL(29),
  'RESERVAS BB': KL(29),
  'RESERVAS FFF': KL(29),
  'RESERVAS CC': KL(29),
  'RESERVAS WE': KL(29),
  'RESERVAS RU': KL(29),
  'RESERVA N8': { tipo: 'tabla', kgPorFull: 40, titulos: 'KL', m3PorKg: 0.006 },
  'RESERVAS LAN CARGO FINAL': { tipo: 'lan', kgPorFull: 47, remarks: 'marca' },
  'RESERVASLANCARGO NUEVO': { tipo: 'lan', kgPorFull: 47, remarks: 'consignee' },
  RESERVASCV: { tipo: 'cv', kgPorFull: 29 },
};

/** Sin plantilla (o con una que no es de reservas): la tabla más reciente, la de KLM. */
const GENERAL = KL(46);

export function formatoReserva(plantilla: string | null | undefined): Formato {
  const k = (plantilla ?? '').trim().replace(/\.xlt$/i, '').toUpperCase();
  return FORMATOS[k] ?? GENERAL;
}

export function hojaReserva(plantilla: string | null | undefined, d: DatosReserva): HojaReserva {
  const f = formatoReserva(plantilla);
  if (f.tipo === 'lan') return hojaLan(f, d);
  if (f.tipo === 'cv') return hojaCv(f, d);
  return hojaTabla(f, d);
}

const fechaTexto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const formula = (f: string, v: number | string = 0) => ({ t: typeof v === 'number' ? 'n' : 's', f, v });
const r2 = (v: number) => Math.round(v * 100) / 100;
const primeraLinea = (t: string) => t.split(/\r?\n/).map((x) => x.trim()).find(Boolean) ?? '';
/** Hoy en Excel (la plantilla de Cargolux firma con =TODAY()). */
const hoy = () => ({ t: 'n', f: 'TODAY()', v: Math.floor(Date.now() / 86_400_000) + 25_569, z: 'dd/mm/yyyy' });

function hojaTabla(f: Extract<Formato, { tipo: 'tabla' }>, d: DatosReserva): HojaReserva {
  const conM3 = f.m3PorKg !== undefined;
  const t =
    f.titulos === 'AT'
      ? ['AWB', 'CAJAS', 'PESO (KG)', 'CLIENTE', 'CODIGO', 'CONSIGNATARIO', 'NOTIFY', 'BROKER', 'DESTINO']
      : ['AWB #', 'BXS', 'Peso (kgs)', 'Cliente', 'Codigo', 'Consignatario', 'Notify', 'Broker', 'Destino'];
  const titulos = conM3 ? [...t.slice(0, 3), 'm3', ...t.slice(3)] : t;
  const primera = 10;
  const ultima = primera + d.guias.length - 1;
  const datos = d.guias.map((g, i) => {
    const r = primera + i;
    const peso = (g.fulls ?? 0) * f.kgPorFull;
    // Como la plantilla: Notify = la marca y Broker = el consignee.
    const resto = [g.marca, g.codigoCliente, g.consignee, g.marca, g.consignee, g.destino];
    return [
      g.awb,
      g.fulls ?? '',
      formula(`B${r}*${f.kgPorFull}`, peso),
      ...(conM3 ? [formula(`C${r}*${f.m3PorKg}`, r2(peso * (f.m3PorKg ?? 0)))] : []),
      ...resto,
    ];
  });
  const fulls = d.guias.reduce((s, g) => s + (g.fulls ?? 0), 0);
  const suma = (col: string, v: number) => (d.guias.length ? formula(`SUM(${col}${primera}:${col}${ultima})`, v) : 0);
  const total = [
    'TOTAL',
    suma('B', fulls),
    suma('C', fulls * f.kgPorFull),
    ...(conM3 ? [suma('D', r2(fulls * f.kgPorFull * (f.m3PorKg ?? 0)))] : []),
  ];
  const anchos =
    f.titulos === 'AT' ? [14.43, 9.29, 15.29, 23.43, 8.43, 42, 21.57, 42, 12.14] : [16, 9.71, 14.14, 21.14, 8.43, 32.86, 11.14, 33.71, 10];
  return {
    filas: [
      [d.agencia],
      ['RESERVAS'],
      [],
      [],
      [],
      [],
      [fechaTexto(d.dia)],
      ['No. Vlo', d.vuelo || d.codigo],
      titulos,
      ...datos,
      total,
      [],
      [],
      ...d.contacto.map((x) => [x]),
    ],
    anchos: conM3 ? [...anchos.slice(0, 3), 8.43, ...anchos.slice(3)] : anchos,
    uniones: ['A7:C7'],
    margenes:
      f.titulos === 'AT'
        ? { left: 0.5, right: 0, top: 1, bottom: 1, header: 0.5, footer: 0.5 }
        : { left: 0, right: 0, top: 0.39, bottom: 0, header: 0, footer: 0 },
  };
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function hojaLan(f: Extract<Formato, { tipo: 'lan' }>, d: DatosReserva): HojaReserva {
  const primera = 6;
  const ultima = primera + d.guias.length - 1;
  const datos = d.guias.map((g, i) => {
    const r = primera + i;
    // "145-0267 8686": la plantilla separa el prefijo (columna AWB) del número.
    const digitos = g.awb.replace(/\D/g, '');
    return [
      'EXPERTS HANDLING CARGO',
      g.origen,
      g.destino,
      digitos.slice(0, 3),
      digitos.slice(3),
      primeraLinea(g.consigneeDatos) || g.consignee,
      g.fulls ?? '',
      formula(`G${r}*${f.kgPorFull}`, (g.fulls ?? 0) * f.kgPorFull),
      '',
      '',
      '',
      '',
      f.remarks === 'marca' ? g.marca : g.consignee,
      '',
      'PEF',
    ];
  });
  const fulls = d.guias.reduce((s, g) => s + (g.fulls ?? 0), 0);
  const suma = (col: string, v: number) => (d.guias.length ? formula(`SUM(${col}${primera}:${col}${ultima})`, v) : 0);
  const t = ultima + 1;
  return {
    filas: [
      ['LAN CARGO'],
      ['Dia', DIAS[new Date(`${d.dia}T12:00:00Z`).getUTCDay()], '', 'Fecha', fechaTexto(d.dia)],
      ['OPERACIONES COMERCIALES / VENTAS'],
      ['Agenc.', 'Origen', 'Dest.', 'AWB', 'Número', 'Consignee', 'Asig', 'Peso', 'Vol.', '', '', '', 'Remarks', '', 'Carga'],
      [],
      ...datos,
      [
        'TOTAL GENERAL',
        '',
        '',
        d.guias.length ? formula(`COUNTA(D${primera}:D${ultima})`, d.guias.length) : 0,
        '',
        '',
        suma('G', fulls),
        suma('H', fulls * f.kgPorFull),
        suma('I', 0),
      ],
    ],
    anchos: [11.07, 11.07, 11.07, 11.07, 11.07, 30, 11.07, 11.07, 4.07, null, null, null, 12.07, null, 10.21],
    uniones: [
      'A1:O1',
      'A3:O3',
      ...'ABCDEFGHIJKLMNO'.split('').map((c) => `${c}4:${c}5`),
      `A${t}:C${t}`,
    ],
    margenes: { left: 0.75, right: 0.75, top: 1, bottom: 1, header: 0, footer: 0 },
  };
}

function hojaCv(f: Extract<Formato, { tipo: 'cv' }>, d: DatosReserva): HojaReserva {
  const primera = 11;
  const ultima = primera + d.guias.length - 1;
  const datos = d.guias.map((g, i) => [
    g.awb,
    g.destino,
    g.tipoCarga,
    g.pago,
    g.consignee,
    g.marca,
    g.fulls ?? '',
    formula(`G${primera + i}*${f.kgPorFull}`, (g.fulls ?? 0) * f.kgPorFull),
  ]);
  const fulls = d.guias.reduce((s, g) => s + (g.fulls ?? 0), 0);
  const suma = (col: string, v: number) => (d.guias.length ? formula(`SUM(${col}${primera}:${col}${ultima})`, v) : 0);
  const t = ultima + 1;
  const obs = t + 1;
  return {
    filas: [
      ['', 'PLANILLA DE RESERVA FLOR', '', '', '', '', 'CODIGO:P-C-02-R02'],
      [],
      [],
      [],
      ['FECHA', fechaTexto(d.dia), '', '', 'No. VUELO', '', d.vuelo || d.codigo],
      [],
      ['AEROLINEA', '', d.codigo, '', 'AGENCIA', '', 'EXPERTS HC'],
      [],
      ['No. GUIA', 'DESTINO', 'TIPO', 'PX', 'CONSIGNATARIO', 'NOTIFY', 'TOTAL', 'TOTAL'],
      ['', '', 'CARGA', 'CC', '', '', 'CAJAS', 'KGS'],
      ...datos,
      ['', '', '', '', '', 'TOTAL', suma('G', fulls), suma('H', fulls * f.kgPorFull)],
      ['OBSERVACIONES'],
      [],
      [],
      [],
      ['Nota:  Conocemos que es responsabilidad del Shipper/Agente:'],
      ['1.  Entregar las flores con temperatura inferior a  8 ºC.  La gypsophylia debe presentar siempre el respectivo Disclaimer.'],
      ['2.  Asegurarse del buen estado del embalaje y/o empaque de la mercancia.'],
      ['3.  Enviar la carga con la documentaciòn adecuada y completa.'],
      [],
      [],
      ['FECHA', hoy(), '', 'FIRMA Y SELLO', '', 'MAURICIO PINCHAO'],
      [],
      [],
      ['Mawney Associates Agente General de Ventas - Av. 12 de Octubre 1942 y Cordero World Trade Center 408B'],
      ['Sita: UIOGGCV ;    PBX:(593) 22900594 Quito, Ecuador'],
      ['RESERVAS: paula@mawney.com.ec,alejandra@maney.com.ec'],
      [],
      ['ESPACIO PARA USO EXCLUSIVO DE MAWNEY ASSOCIATES.'],
      [],
      ['CODIGO'],
      ['CONEXIÓN', '', '', 'FIRMA'],
    ],
    anchos: [15, 10, 13, 6, 34, 24, 10, 10],
    uniones: ['A1:A3', 'B1:F3', 'G1:H3', 'G5:H5', 'G7:H7', 'A9:A10', 'B9:B10', 'E9:E10', 'F9:F10', `B${obs}:H${obs}`],
    margenes: { left: 0.5, right: 0.3, top: 0.5, bottom: 0.5, header: 0, footer: 0 },
  };
}
