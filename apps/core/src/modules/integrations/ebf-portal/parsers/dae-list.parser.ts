import type { DaeListItem } from '../types/dae.types';

const TR_RX = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const TD_RX = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi;
const TH_RX = /<th\b([^>]*)>([\s\S]*?)<\/th>/gi;
const THEAD_RX = /<thead\b[^>]*>([\s\S]*?)<\/thead>/i;
const PAGE_RX = /hx-get=["']\?page=(\d+)["']/g;
const TAG_RX = /<([a-z][\w-]*)\b([^>]*)>/gi;
const ATTR_RX = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** Atributos que suelen llevar el significado de un ícono/badge sin texto. */
const LABEL_ATTRS = [
  'title',
  'aria-label',
  'alt',
  'data-bs-original-title',
  'data-original-title',
  'data-bs-title',
  'data-title',
  'data-tooltip',
  'data-value',
  'data-status',
  'data-state',
];

/** Prefijos de librerías de íconos (Bootstrap Icons `bi-`, Font Awesome `fa-`, etc.). */
const ICON_PREFIX_RX = /^(?:bi|fa|fas|far|mdi|glyphicon|icon|ti|ri|la|las|lar|ion|feather)-/;
/** Forma del ícono: check ✔ / x ✘ (más fuerte que el color). */
const SHAPE_YES_RX = /^(?:check\d?(?:-.+)?|circle-check.*|square-check.*|ok(?:-.+)?|yes|tick.*|true)$/;
const SHAPE_NO_RX = /^(?:x(?:-.+)?|times.*|xmark.*|circle-xmark.*|square-xmark.*|ban|dash-circle.*|slash-circle.*|remove(?:-.+)?|no|false)$/;
/** Color contextual de Bootstrap: text-success / bg-danger / badge-success… */
const COLOR_YES_RX = /(?:^|-)(?:success|green)(?:-subtle|-emphasis)?$/;
const COLOR_NO_RX = /(?:^|-)(?:danger|red|error)(?:-subtle|-emphasis)?$/;

const TRUE_WORDS = new Set([
  'true', 'yes', 'si', '1', 'ok', 'vigente', 'activo', 'activa', 'active',
  'valid', 'valido', 'valida', 'enabled', 'habilitado', 'habilitada',
]);
const FALSE_WORDS = new Set([
  'false', 'no', '0', 'no vigente', 'vencido', 'vencida', 'caducado',
  'caducada', 'expirado', 'expirada', 'expired', 'inactivo', 'inactiva',
  'inactive', 'invalid', 'invalido', 'invalida', 'anulado', 'anulada',
  'disabled', 'deshabilitado', 'deshabilitada',
]);

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)));
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseAttrs(attrs: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RX.exec(attrs)) !== null) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? '';
  }
  return out;
}

function foldWord(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** 'True' / 'Vigente' / 'No' → 'Sí' | 'No'; cualquier otro texto → null. */
function booleanWord(label: string): 'Sí' | 'No' | null {
  const w = foldWord(label);
  if (TRUE_WORDS.has(w)) return 'Sí';
  if (FALSE_WORDS.has(w)) return 'No';
  return null;
}

/**
 * Valor de una celda sin texto visible (ícono, badge vacío, checkbox).
 * Orden de evidencia:
 *   1. checkbox/radio → checked ? 'Sí' : 'No'
 *   2. atributo descriptivo (title/aria-label/alt/data-*) con palabra booleana
 *      ('True', 'Vigente', 'No'…) → 'Sí' | 'No'
 *   3. forma del ícono: check… → 'Sí', x/times/xmark… → 'No'
 *   4. color contextual: *-success → 'Sí', *-danger → 'No'
 *   5. atributo descriptivo de un elemento hijo, tal cual (p.ej. un tooltip)
 * Null si nada es concluyente.
 *
 * `tdAttrs` = atributos del propio `<td>` (django-tables2 permite attrs por
 * celda); cuentan para 1-4 pero su title no se usa crudo en 5 (suele ser un
 * tooltip genérico de la celda, no su valor).
 */
export function iconCellValue(tdAttrs: string, cellHtml: string): string | null {
  const tags: Array<{ name: string; attrs: string }> = [];
  TAG_RX.lastIndex = 0;
  let t: RegExpExecArray | null;
  while ((t = TAG_RX.exec(cellHtml)) !== null) {
    tags.push({ name: t[1].toLowerCase(), attrs: t[2] ?? '' });
  }
  tags.push({ name: 'td', attrs: tdAttrs });

  const labels: Array<{ value: string; fromTd: boolean }> = [];
  const tokens: string[] = [];
  for (const tag of tags) {
    const attrs = parseAttrs(tag.attrs);
    if (tag.name === 'input' && /^(?:checkbox|radio)$/i.test(attrs.type ?? '')) {
      return /\bchecked\b/i.test(tag.attrs) ? 'Sí' : 'No';
    }
    for (const a of LABEL_ATTRS) {
      const v = decodeEntities(attrs[a] ?? '').trim();
      if (v) labels.push({ value: v, fromTd: tag.name === 'td' });
    }
    for (const c of (attrs.class ?? '').split(/\s+/)) {
      if (c) tokens.push(c.toLowerCase());
    }
    if (attrs.src) {
      // Django admin: /static/admin/img/icon-yes.svg | icon-no.svg
      const file = attrs.src.split(/[/?#]/).filter(Boolean).pop() ?? '';
      tokens.push(file.replace(/\.[a-z0-9]+$/i, '').toLowerCase());
    }
  }

  for (const l of labels) {
    const b = booleanWord(l.value);
    if (b) return b;
  }

  const shapes = tokens.map((tok) => tok.replace(ICON_PREFIX_RX, ''));
  if (shapes.some((s) => SHAPE_NO_RX.test(s))) return 'No';
  if (shapes.some((s) => SHAPE_YES_RX.test(s))) return 'Sí';
  if (tokens.some((tok) => COLOR_NO_RX.test(tok))) return 'No';
  if (tokens.some((tok) => COLOR_YES_RX.test(tok))) return 'Sí';

  return labels.find((l) => !l.fromTd)?.value ?? null;
}

/** Texto de la celda; si no tiene texto visible, intenta derivarlo del ícono/badge. */
function cellValue(tdAttrs: string, cellHtml: string): string {
  const text = stripHtml(cellHtml);
  if (text) return text;
  return iconCellValue(tdAttrs, cellHtml) ?? '';
}

/** Header de una columna: texto, o title/aria-label si el `<th>` es solo ícono. */
function headerLabel(thAttrs: string, thHtml: string): string | null {
  const text = stripHtml(thHtml);
  if (text) return text;
  const attrs = parseAttrs(thAttrs);
  const label = decodeEntities(attrs.title ?? attrs['aria-label'] ?? '').trim();
  return label || null;
}

export interface DaeListParseResult {
  items: DaeListItem[];
  columns: string[];
  hasNextPage: boolean;
  /**
   * Columnas con nombre que quedaron vacías en TODAS las filas, con el HTML
   * de muestra de la primera celda. Diagnóstico para refinar el parser sin
   * tener que ir al portal (el service lo loguea una vez por columna).
   */
  emptyColumns: Array<{ column: string; sampleHtml: string }>;
}

/**
 * Parsea la tabla SSR de la lista de DAEs (columnas dinámicas: se mapean
 * por posición contra los `<th>`).
 *
 * Headers posicionales: un `<th>` sin texto (columna de acciones/checkbox)
 * ocupa su lugar con key `col<i>` y no se expone en `columns`, así no
 * corre los valores de las columnas siguientes.
 */
export function parseDaeList(html: string, currentPage: number): DaeListParseResult {
  const theadMatch = THEAD_RX.exec(html);
  const headerScope = theadMatch ? theadMatch[1] : html;

  const headers: Array<string | null> = [];
  TH_RX.lastIndex = 0;
  let h: RegExpExecArray | null;
  while ((h = TH_RX.exec(headerScope)) !== null) {
    headers.push(headerLabel(h[1] ?? '', h[2]));
  }
  const columns = headers.filter((x): x is string => x !== null);

  const items: DaeListItem[] = [];
  const firstCellHtml = new Map<string, string>();
  TR_RX.lastIndex = 0;
  let row: RegExpExecArray | null;
  while ((row = TR_RX.exec(html)) !== null) {
    const rowHtml = row[1];
    if (!/<td\b/i.test(rowHtml)) continue;
    const raw: Record<string, string> = {};
    let i = 0;
    TD_RX.lastIndex = 0;
    let td: RegExpExecArray | null;
    while ((td = TD_RX.exec(rowHtml)) !== null) {
      const key = headers[i] ?? `col${i}`;
      raw[key] = cellValue(td[1] ?? '', td[2]);
      if (!firstCellHtml.has(key)) firstCellHtml.set(key, td[0]);
      i++;
    }
    if (i === 0) continue;
    items.push({ raw });
  }

  const emptyColumns =
    items.length === 0
      ? []
      : columns
          .filter((c) => items.every((it) => !it.raw[c]))
          .map((column) => ({
            column,
            sampleHtml: (firstCellHtml.get(column) ?? '')
              .replace(/\s+/g, ' ')
              .slice(0, 300),
          }));

  const pageNums = new Set<number>();
  PAGE_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAGE_RX.exec(html)) !== null) pageNums.add(parseInt(m[1], 10));
  const maxPage = pageNums.size ? Math.max(...pageNums) : 1;

  return {
    items,
    columns,
    hasNextPage: maxPage > currentPage,
    emptyColumns,
  };
}
