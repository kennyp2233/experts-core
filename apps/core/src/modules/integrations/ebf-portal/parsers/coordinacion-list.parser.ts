import type { CoordinacionListItem } from '../types/coordinacion.types';

const COLUMN_KEYS = [
  'etd',
  'awb',
  'exportador',
  'marcacion',
  'producto',
  'dae',
  'hawb',
  'bxsCoo',
  'pcsCoo',
  'bxsWh',
  'pcsWh',
  'origen',
  'destinoAwb',
  'destinoFinal',
  'creacion',
] as const;

const TR_RX = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const TD_RX = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
/** Botón ✏️ update — la fuente canónica del detalleId en el despacho real. */
const UPDATE_ACTION_RX = /\/exportador\/coordinacion\/(\d+)\/update\//;
/** Botón 🗑️ delete — fallback si el update no estuviera presente. */
const DELETE_ACTION_RX = /\/exportador\/detalle\/(\d+)\/delete\//;
/** Path detalle clásico (no observado en producción todavía, queda como último fallback). */
const DETAIL_RX = /\/exportador\/detalle_coordinacion\/([^/"']+)\/?/;
const PAGE_RX = /hx-get=["']\?page=(\d+)["']/g;
/** "22-05-2026 12:29<br>EXPERTS" → ["22-05-2026 12:29", "EXPERTS"]. */
const CREACION_SPLIT_RX = /<br\s*\/?>/i;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTds(rowHtml: string): string[] {
  const out: string[] = [];
  TD_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TD_RX.exec(rowHtml)) !== null) out.push(m[1]);
  return out;
}

/**
 * Parsea la tabla SSR del dashboard `/exportador/coordinacion/lista/`.
 * Devuelve filas con valores texto + un raw map por columna (incluyendo
 * texto puro). El detalleId se intenta extraer de cualquier link de detalle
 * dentro de la fila; queda null si la fila no expone uno (caso conocido:
 * algunas filas usan htmx con atributos no estándar — refinar cuando se
 * vea HTML logueado en horario).
 */
export function parseCoordinacionList(html: string): {
  items: CoordinacionListItem[];
  hasNextPage: boolean;
  currentPage: number;
} {
  const items: CoordinacionListItem[] = [];

  TR_RX.lastIndex = 0;
  let row: RegExpExecArray | null;
  while ((row = TR_RX.exec(html)) !== null) {
    const rowHtml = row[1];
    if (!/<td\b/i.test(rowHtml)) continue;
    const tds = extractTds(rowHtml);
    if (tds.length < COLUMN_KEYS.length) continue;

    const raw: Record<string, string> = {};
    COLUMN_KEYS.forEach((key, idx) => {
      raw[key] = stripHtml(tds[idx] ?? '');
    });

    const detalleId =
      UPDATE_ACTION_RX.exec(rowHtml)?.[1] ??
      DELETE_ACTION_RX.exec(rowHtml)?.[1] ??
      DETAIL_RX.exec(rowHtml)?.[1] ??
      null;

    // La columna "Creación" viene como "DD-MM-YYYY HH:MM<br>USERNAME"
    const creacionRawHtml = tds[14] ?? '';
    const creacionParts = creacionRawHtml.split(CREACION_SPLIT_RX);
    const creacionFecha = creacionParts[0]
      ? stripHtml(creacionParts[0]) || null
      : null;
    const creacionUser = creacionParts[1]
      ? stripHtml(creacionParts[1]) || null
      : null;

    items.push({
      etd: raw.etd || null,
      awb: raw.awb || null,
      exportador: raw.exportador || null,
      marcacion: raw.marcacion || null,
      producto: raw.producto || null,
      dae: raw.dae || null,
      hawb: raw.hawb || null,
      bxsCoo: raw.bxsCoo || null,
      pcsCoo: raw.pcsCoo || null,
      bxsWh: raw.bxsWh || null,
      pcsWh: raw.pcsWh || null,
      origen: raw.origen || null,
      destinoAwb: raw.destinoAwb || null,
      destinoFinal: raw.destinoFinal || null,
      creacion: raw.creacion || null,
      creacionFecha,
      creacionUser,
      detalleId,
      raw,
    });
  }

  const pageNums = new Set<number>();
  let m: RegExpExecArray | null;
  PAGE_RX.lastIndex = 0;
  while ((m = PAGE_RX.exec(html)) !== null) pageNums.add(parseInt(m[1], 10));
  const maxPage = pageNums.size ? Math.max(...pageNums) : 1;
  const currentPageMatch = /[?&]page=(\d+)\b/.exec(html);
  const currentPage = currentPageMatch ? parseInt(currentPageMatch[1], 10) : 1;

  return {
    items,
    hasNextPage: maxPage > currentPage,
    currentPage,
  };
}
