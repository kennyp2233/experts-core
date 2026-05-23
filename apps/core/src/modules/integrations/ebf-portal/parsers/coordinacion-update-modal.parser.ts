import { parseSelectOptions } from './select-options.parser';
import { extractCsrfFormToken } from './csrf.parser';
import { extractCreateErrors } from './coordinacion-create-modal.parser';
import type {
  CompoundFormsetConfig,
  ProductoOption,
} from '../types/coordinacion-create.types';
import type {
  UpdateFormContext,
  UpdateFormSpec,
} from '../types/coordinacion-update.types';

const SELECT_RX = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
const ATTR_RX = /(\w[\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
const HIDDEN_INPUT_RX =
  /<input\b[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*type=["']hidden["'][^>]*>|<input\b[^>]*type=["']hidden["'][^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi;
const NUMBER_INPUT_RX =
  /<input\b[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*type=["']number["'][^>]*>|<input\b[^>]*type=["']number["'][^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi;
/** TEXT input para `bxs_coo` y `pcs_coo` (vienen como type="text" readonly). */
const TEXT_INPUT_RX =
  /<input\b[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*type=["']text["'][^>]*>|<input\b[^>]*type=["']text["'][^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi;

function parseAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RX.exec(tag)) !== null) {
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    out[m[1].toLowerCase()] = val;
  }
  return out;
}

function collectHidden(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  HIDDEN_INPUT_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HIDDEN_INPUT_RX.exec(html)) !== null) {
    const name = m[1] ?? m[3];
    const value = m[2] ?? m[4] ?? '';
    if (name) out[name] = value;
  }
  return out;
}

function collectNumbers(html: string): Record<string, number> {
  const out: Record<string, number> = {};
  NUMBER_INPUT_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUMBER_INPUT_RX.exec(html)) !== null) {
    const name = m[1] ?? m[3];
    const raw = m[2] ?? m[4] ?? '0';
    if (name) out[name] = Number(raw) || 0;
  }
  // bxs/pcs son type="text"
  TEXT_INPUT_RX.lastIndex = 0;
  while ((m = TEXT_INPUT_RX.exec(html)) !== null) {
    const name = m[1] ?? m[3];
    const raw = m[2] ?? m[4] ?? '0';
    if (name && (name === 'bxs_coo' || name === 'pcs_coo')) {
      out[name] = parseFloat(raw.replace(',', '.')) || 0;
    }
  }
  return out;
}

function findSelect(
  html: string,
  name: string,
): { attrs: Record<string, string>; body: string } | null {
  SELECT_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SELECT_RX.exec(html)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (attrs.name === name) return { attrs, body: m[2] };
  }
  return null;
}

function parseProductos(html: string): {
  options: ProductoOption[];
  selectedId: number | null;
} {
  const sel = findSelect(html, 'producto');
  if (!sel) return { options: [], selectedId: null };
  const options = parseSelectOptions(sel.body).map((opt) => ({
    value: opt.value,
    label: opt.label,
    isFullBxs: opt.data?.['is-full-bxs'] === 'True',
    isCompoundProduct: opt.data?.['is-compound-product'] === 'True',
    errorMessage: opt.data?.['error-message']
      ? opt.data['error-message']
      : null,
  }));
  // Buscar `selected` en el body del select
  const selectedMatch = /<option\b[^>]*value=["']([^"']+)["'][^>]*\bselected\b/i.exec(
    sel.body,
  );
  const selectedId = selectedMatch ? parseInt(selectedMatch[1], 10) : null;
  return {
    options,
    selectedId: Number.isFinite(selectedId) ? selectedId : null,
  };
}

function parseCompoundFormset(html: string): CompoundFormsetConfig {
  const hidden = collectHidden(html);
  const sel = findSelect(html, 'compound_products-0-producto');
  return {
    prefix: 'compound_products',
    totalForms: Number(hidden['compound_products-TOTAL_FORMS'] ?? 2),
    initialForms: Number(hidden['compound_products-INITIAL_FORMS'] ?? 0),
    minNumForms: Number(hidden['compound_products-MIN_NUM_FORMS'] ?? 2),
    maxNumForms: Number(hidden['compound_products-MAX_NUM_FORMS'] ?? 1000),
    productoOptions: sel ? parseSelectOptions(sel.body) : [],
  };
}

/**
 * Extrae el valor visible que sigue a un `<b>Label:</b>` en los rows de
 * contexto del modal. Devuelve null si no se encuentra.
 */
function extractContextField(html: string, label: string): string | null {
  const rx = new RegExp(
    `<b>\\s*${label}\\s*:?\\s*<\\/b>[\\s\\S]{0,200}?<p[^>]*>([\\s\\S]*?)<\\/p>`,
    'i',
  );
  const m = rx.exec(html);
  if (!m) return null;
  const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

/** Detecta si el row de "*No se puede editar el Producto..." NO está oculto. */
function isProductoLocked(html: string): boolean {
  const rx =
    /<div\b[^>]*class=["']([^"']*)["'][^>]*>[\s\S]*?Transacciones de Bodega[\s\S]*?<\/div>/i;
  const m = rx.exec(html);
  if (!m) return false;
  return !/\bd-none\b/.test(m[1]);
}

/**
 * Parsea el HTML del modal de edición devuelto por
 * `GET /exportador/coordinacion/<detalleId>/update/`. Mismas piezas que el
 * create modal + contexto read-only (Exportador, AWB, HAWB, DAE, etc.) +
 * detección de bloqueo de producto cuando hay transacciones WH.
 */
export function parseUpdateModal(
  detalleId: number,
  html: string,
): UpdateFormSpec {
  const csrf = extractCsrfFormToken(html);
  if (!csrf) {
    throw new Error(
      `No se pudo extraer csrfmiddlewaretoken del modal update (detalleId=${detalleId}).`,
    );
  }

  const numbers = collectNumbers(html);
  const { options: productos, selectedId } = parseProductos(html);

  const context: UpdateFormContext = {
    exportador: extractContextField(html, 'Exportador'),
    marcacion: extractContextField(html, 'Marcación'),
    cliente: extractContextField(html, 'Cliente'),
    despacho: extractContextField(html, 'Despacho'),
    awb: extractContextField(html, 'AWB'),
    hawb: extractContextField(html, 'HAWB'),
    dae: extractContextField(html, 'DAE'),
  };

  return {
    detalleId,
    csrfToken: csrf,
    context,
    productos,
    currentProductoId: selectedId,
    productoLocked: isProductoLocked(html),
    compoundFormset: parseCompoundFormset(html),
    currentValues: {
      fbCoo: numbers['fb_coo'] ?? 0,
      hbCoo: numbers['hb_coo'] ?? 0,
      qbCoo: numbers['qb_coo'] ?? 0,
      ebCoo: numbers['eb_coo'] ?? 0,
      bxsCoo: numbers['bxs_coo'] ?? 0,
      pcsCoo: numbers['pcs_coo'] ?? 0,
    },
  };
}

/**
 * Cuando el POST update devuelve 200 (en vez de 302), parsea errores
 * del HTML. Reusa el extractor del create modal — la estructura de
 * errores es la misma.
 */
export const extractUpdateErrors = extractCreateErrors;
