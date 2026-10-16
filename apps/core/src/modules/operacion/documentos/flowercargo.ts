/**
 * Archivo de manifiesto para FlowerCargo (texto separado por tabs, una fila
 * por guía hija, 71 columnas). Formato deducido de un archivo real de
 * FlowerCargo (guía 369-8469 5461) y de las respuestas del dueño (2026-10-16):
 *
 * - Va con NUESTROS números de guía hija (la columna T que hoy corrige a mano).
 * - FlowerCargo arma una guía hija por RUC de finca: fincas con el mismo RUC
 *   (p. ej. Utopía: FYC, Chivan, Santa Marta) van en una sola fila sumando
 *   piezas y peso, con el número de nuestra guía hija de más piezas.
 * - Peso: el de nuestro sistema (él lo iguala al de FlowerCargo).
 * - Consignee de la guía hija = consignatario final (datos ECUAPASS de la marca).
 * - Destino final: lo que importa es el país.
 * - `LTR` y `N` son fijos.
 */

export interface GuiaHijaArchivo {
  numero: string;
  dae: string | null;
  piezas: number;
  kg: number;
  finca: { ruc: string | null; nombre: string; direccion: string | null; tipoDocumento: string | null };
}

export interface Parte {
  nombre: string | null;
  direccion: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  pais: string | null;
}

export interface DatosArchivoFlowerCargo {
  /** "369-84695461" o "369-8469 5461". */
  awb: string;
  fechaVuelo: Date;
  manifiesto: {
    prefijo: string;
    aduana: string | null;
    anio: string | null;
    tipo: string | null;
    numero: string | null;
    secuencial: string | null;
  };
  aerolinea: { nombre: string; codigoCae: string | null };
  /** Código IATA del aeropuerto de salida (UIO). */
  origen: string;
  destinoAwb: { codigo: string | null; pais: string | null };
  destinoFinal: { codigo: string | null; pais: string | null };
  consignee: Parte;
  notify: Parte;
  mercancia: string;
  /** OCE del consolidador (FlowerCargo: 23901050). */
  oceConsolidador: string;
  guias: GuiaHijaArchivo[];
}

export interface FilaFlowerCargo {
  linea: number;
  guiaHija: string;
  /** Guías hijas nuestras que se juntaron en la fila (mismo RUC). */
  guiasAgrupadas: string[];
  finca: string;
  ruc: string | null;
  piezas: number;
  kg: number;
  dae: string | null;
  columnas: string[];
}

export const COLUMNAS_FLOWERCARGO = 71;

const pad = (v: string | number | null | undefined, n: number) => (v === null || v === undefined || v === '' ? '' : String(v).padStart(n, '0'));
const digitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');
const fecha = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

/**
 * Texto apto para el archivo: sin tildes ni eñes, sin tabs ni saltos de línea
 * y solo caracteres simples (el archivo se rompe si se edita con otro formato).
 */
export function limpiar(v: string | null | undefined): string {
  return (v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\|\|/g, ' ')
    .replace(/[^A-Za-z0-9 &/,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "369-8469 5461" → "036984695461" (12 dígitos, como lo pide el manifiesto). */
export const awbArchivo = (awb: string) => digitos(awb).padStart(12, '0');

/**
 * Una fila por RUC: suma piezas y peso; número y finca de la guía hija con más
 * piezas. El RUC se compara solo por sus dígitos: en el sistema viejo las
 * fincas de un mismo dueño llevan puntos al final para no repetir el RUC
 * (Utopía: "1793074472001.", "1793074472001..", …).
 */
export function agruparPorRuc(guias: GuiaHijaArchivo[]) {
  const grupos = new Map<string, GuiaHijaArchivo[]>();
  for (const g of [...guias].sort((a, b) => a.numero.localeCompare(b.numero))) {
    const k = digitos(g.finca.ruc) || `sin-ruc:${g.numero}`;
    const lista = grupos.get(k);
    if (lista) lista.push(g);
    else grupos.set(k, [g]);
  }
  return [...grupos.values()].map((gs) => {
    const principal = gs.reduce((m, g) => (g.piezas > m.piezas ? g : m), gs[0]);
    return {
      principal,
      guias: gs,
      piezas: gs.reduce((a, g) => a + g.piezas, 0),
      kg: Math.round(gs.reduce((a, g) => a + g.kg, 0) * 100) / 100,
      daes: [...new Set(gs.map((g) => g.dae).filter((d): d is string => !!d))],
    };
  });
}

export function armarArchivoFlowerCargo(d: DatosArchivoFlowerCargo): { filas: FilaFlowerCargo[]; advertencias: string[] } {
  const advertencias: string[] = [];
  const m = d.manifiesto;
  if (!m.numero) advertencias.push('Falta el número de manifiesto (lo da la aerolínea).');
  if (!m.secuencial) advertencias.push('Falta el secuencial de la guía en el manifiesto.');
  if (!d.aerolinea.codigoCae) advertencias.push('La aerolínea no tiene código CAE en datos maestros.');
  if (!d.consignee.nombre) advertencias.push('La marca no tiene datos ECUAPASS de la guía hija (consignee).');
  if (!d.notify.nombre) advertencias.push('La marca no tiene notify en sus datos ECUAPASS.');
  if (!d.destinoFinal.pais) advertencias.push('El destino final no tiene país.');

  const ec = `EC${d.origen}`;
  const oceAerolinea = d.aerolinea.codigoCae ? `039${pad(digitos(d.aerolinea.codigoCae), 5)}` : '';
  const f = fecha(d.fechaVuelo);
  const secuencial = pad(digitos(m.secuencial), 5);
  const tipoDoc = (t: string | null) => pad(digitos(t), 3);

  const filas = agruparPorRuc(d.guias).map((g, i): FilaFlowerCargo => {
    const p = g.principal;
    if (g.daes.length > 1) {
      advertencias.push(`El RUC ${p.finca.ruc} tiene ${g.daes.length} DAE distintas; va la de la guía ${p.numero}.`);
    }
    if (!p.dae) advertencias.push(`La guía hija ${p.numero} no tiene DAE.`);
    const c = Array<string>(COLUMNAS_FLOWERCARGO).fill('');
    const poner = (col: number, v: string) => {
      c[col - 1] = v;
    };
    poner(1, limpiar(m.prefijo) || 'CEC');
    poner(2, pad(m.aduana, 3));
    poner(3, m.anio ?? String(d.fechaVuelo.getUTCFullYear()));
    poner(4, limpiar(m.tipo));
    poner(5, pad(digitos(m.numero), 6));
    poner(6, 'AE');
    poner(7, `${d.destinoAwb.pais ?? ''}${d.destinoAwb.codigo ?? ''}`);
    poner(8, '029');
    poner(9, 'LTR');
    poner(10, 'N');
    poner(11, secuencial);
    poner(12, f);
    poner(13, f);
    poner(14, limpiar(d.aerolinea.nombre));
    poner(15, ec);
    poner(16, oceAerolinea);
    poner(17, oceAerolinea);
    poner(18, ec);
    poner(19, oceAerolinea);
    poner(20, p.numero);
    poner(21, p.numero.slice(-4));
    poner(22, 'HWB');
    poner(23, awbArchivo(d.awb));
    poner(24, secuencial);
    poner(25, f);
    poner(26, oceAerolinea);
    poner(27, limpiar(d.consignee.nombre));
    poner(28, limpiar(d.consignee.direccion));
    poner(29, tipoDoc(d.consignee.tipoDocumento) || '005');
    poner(30, digitos(d.consignee.documento) || '9999999999999');
    poner(31, limpiar(d.consignee.pais ?? d.destinoFinal.pais));
    poner(32, limpiar(d.notify.nombre));
    poner(33, limpiar(d.notify.direccion));
    poner(34, tipoDoc(d.notify.tipoDocumento) || '005');
    poner(35, digitos(d.notify.documento) || '9999999999999');
    poner(36, limpiar(p.finca.nombre));
    poner(37, limpiar(p.finca.direccion));
    poner(38, tipoDoc(p.finca.tipoDocumento) || '001');
    poner(39, digitos(p.finca.ruc));
    poner(40, ec);
    poner(41, d.oceConsolidador);
    poner(44, `${d.destinoFinal.pais ?? ''}${d.destinoFinal.codigo ?? ''}`);
    poner(47, '40');
    poner(48, 'I');
    poner(49, String(i + 1));
    poner(50, 'CG');
    poner(51, g.kg.toFixed(2));
    poner(52, String(g.piezas));
    poner(53, '035');
    poner(54, limpiar(d.mercancia));
    poner(55, limpiar(d.mercancia));
    poner(57, '0');
    poner(60, f);
    poner(61, ec);
    poner(63, limpiar(d.mercancia));
    poner(64, digitos(p.dae));
    return {
      linea: i + 1,
      guiaHija: p.numero,
      guiasAgrupadas: g.guias.map((x) => x.numero),
      finca: p.finca.nombre,
      ruc: digitos(p.finca.ruc) || null,
      piezas: g.piezas,
      kg: g.kg,
      dae: p.dae,
      columnas: c,
    };
  });
  return { filas, advertencias: [...new Set(advertencias)] };
}

/** Texto final: tabs, fin de línea de Windows, solo ASCII. */
export const textoArchivo = (filas: FilaFlowerCargo[]) => filas.map((f) => f.columnas.join('\t')).join('\r\n') + '\r\n';
