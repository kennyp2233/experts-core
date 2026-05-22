import type { SelectOption } from '../types/coordinacion-create.types';

const OPTION_RX = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
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

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parsea respuestas parciales de los endpoints `/exportador/populate_*`.
 * Devuelve sólo opciones con value no vacío (descarta el placeholder
 * "---------" que Django añade por defecto).
 *
 * data-* attrs (ej. `data-suffix` en vuelos, `data-is-full-bxs` en productos)
 * se preservan en `option.data`.
 */
export function parseSelectOptions(html: string): SelectOption[] {
  const out: SelectOption[] = [];
  OPTION_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = OPTION_RX.exec(html)) !== null) {
    const attrs = parseAttrs(m[1]);
    const value = attrs.value ?? '';
    if (!value) continue;
    const label = stripTags(m[2]);
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('data-')) data[k.slice(5)] = v;
    }
    out.push({
      value,
      label,
      ...(Object.keys(data).length ? { data } : {}),
    });
  }
  return out;
}
