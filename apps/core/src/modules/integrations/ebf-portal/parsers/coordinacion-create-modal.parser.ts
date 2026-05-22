import { parseSelectOptions } from './select-options.parser';
import { extractCsrfFormToken } from './csrf.parser';
import type {
  CompoundFormsetConfig,
  CreateFormHidden,
  CreateFormSpec,
  ProductoOption,
} from '../types/coordinacion-create.types';

const HIDDEN_INPUT_RX =
  /<input\b[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*type=["']hidden["'][^>]*>|<input\b[^>]*type=["']hidden["'][^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi;

const NUMBER_INPUT_RX =
  /<input\b[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*type=["']number["'][^>]*>|<input\b[^>]*type=["']number["'][^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi;

const SELECT_RX = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
const ATTR_RX = /(\w[\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;

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

function collectHiddenInputs(html: string): Record<string, string> {
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

function collectNumberInputs(html: string): Record<string, number> {
  const out: Record<string, number> = {};
  NUMBER_INPUT_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUMBER_INPUT_RX.exec(html)) !== null) {
    const name = m[1] ?? m[3];
    const raw = m[2] ?? m[4] ?? '0';
    if (name) out[name] = Number(raw) || 0;
  }
  return out;
}

function findSelectBlock(
  html: string,
  selectName: string,
): { attrs: Record<string, string>; body: string } | null {
  SELECT_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SELECT_RX.exec(html)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (attrs.name === selectName) return { attrs, body: m[2] };
  }
  return null;
}

function parseProductos(html: string): ProductoOption[] {
  const main = findSelectBlock(html, 'producto');
  if (!main) return [];
  return parseSelectOptions(main.body).map((opt) => ({
    value: opt.value,
    label: opt.label,
    isFullBxs: opt.data?.['is-full-bxs'] === 'True',
    isCompoundProduct: opt.data?.['is-compound-product'] === 'True',
    errorMessage: opt.data?.['error-message']
      ? opt.data['error-message']
      : null,
  }));
}

function parseCompoundFormset(html: string): CompoundFormsetConfig {
  const hidden = collectHiddenInputs(html);
  const compoundSelect = findSelectBlock(html, 'compound_products-0-producto');
  return {
    prefix: 'compound_products',
    totalForms: Number(hidden['compound_products-TOTAL_FORMS'] ?? 2),
    initialForms: Number(hidden['compound_products-INITIAL_FORMS'] ?? 0),
    minNumForms: Number(hidden['compound_products-MIN_NUM_FORMS'] ?? 2),
    maxNumForms: Number(hidden['compound_products-MAX_NUM_FORMS'] ?? 1000),
    productoOptions: compoundSelect
      ? parseSelectOptions(compoundSelect.body)
      : [],
  };
}

/**
 * Parsea el HTML del modal "Crear Detalle De Coordinación" devuelto por
 * `GET /exportador/detalle/create/`. Extrae csrf token, IDs ocultos del
 * cascade, productos disponibles (con sus flags), config del formset
 * compuesto, y valores numéricos iniciales.
 */
export function parseCreateModal(html: string): CreateFormSpec {
  const csrf = extractCsrfFormToken(html);
  if (!csrf) {
    throw new Error(
      'No se pudo extraer csrfmiddlewaretoken del modal Crear Detalle De Coordinación.',
    );
  }
  const hidden = collectHiddenInputs(html);
  const numbers = collectNumberInputs(html);

  const hiddenSpec: CreateFormHidden = {
    exportador: hidden['exportador'] ?? '',
    consignatarioMarcacion: hidden['consignatario_marcacion'] ?? '',
    docCoordinacion: hidden['doc_coordinacion'] ?? '',
    dae: hidden['dae'] ?? '',
  };

  return {
    csrfToken: csrf,
    hidden: hiddenSpec,
    productos: parseProductos(html),
    compoundFormset: parseCompoundFormset(html),
    initialNumericValues: {
      fbCoo: numbers['fb_coo'] ?? 0,
      hbCoo: numbers['hb_coo'] ?? 0,
      qbCoo: numbers['qb_coo'] ?? 0,
      ebCoo: numbers['eb_coo'] ?? 0,
      bxsCoo: numbers['bxs_coo'] ?? 0,
      pcsCoo: numbers['pcs_coo'] ?? 0,
    },
  };
}

const ERROR_ITEM_RX =
  /<li\b[^>]*class=["'][^"']*\b(?:errorlist|alert-danger)\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
const ERROR_ALERT_RX =
  /<div\b[^>]*class=["'][^"']*\balert-danger\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;

/**
 * Cuando el POST de creación devuelve 200 (en vez de 302 a la lista), el
 * portal re-renderiza el form con mensajes de error. Esta función intenta
 * recolectarlos.
 */
export function extractCreateErrors(html: string): string[] {
  const out: string[] = [];
  const collect = (rx: RegExp): void => {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) !== null) {
      const txt = m[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (txt) out.push(txt);
    }
  };
  collect(ERROR_ITEM_RX);
  collect(ERROR_ALERT_RX);
  return [...new Set(out)];
}
