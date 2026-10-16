/**
 * Normalización de valores que llegan de Access por el bridge.
 * Access guarda texto con espacios de relleno, usa 0 como "sin valor" en
 * muchos códigos, y separa líneas/campos dentro de un texto con "||".
 */

/** Texto recortado; vacío → null. */
export function txt(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Número; vacío o no numérico → null. Se redondea a 6 decimales: los campos
 * `single` de Access llegan como float32 (1.97 → 1.970000028610229).
 */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null;
}

/** Entero (redondea); vacío → null. */
export function int(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n);
}

/** Número donde 0 significa "sin valor" (ej. códigos SESA). */
export function numSin0(v: unknown): number | null {
  const n = num(v);
  return n === null || n === 0 ? null : n;
}

/** Flag de Access (byte/bit): cualquier valor distinto de 0 = true. */
export function flag(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  const n = num(v);
  return n !== null && n !== 0;
}

/**
 * Estado de las tablas PIN_* del sistema viejo: 0 = activo, distinto de 0 =
 * inactivo (el ejecutable filtra con `WHERE marEstado=0`, `aerEstado=0`, …).
 */
export function activoPin(v: unknown): boolean {
  const n = num(v);
  return n === null || n === 0;
}

/** Separa "a||b||c" en partes recortadas (conserva posiciones vacías). */
export function partes(v: unknown): string[] {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.trim() === '') return [];
  return s.split('||').map((p) => p.trim());
}

/** Parte n-ésima de un texto con "||"; vacío → null. */
export function parte(v: unknown, n: number): string | null {
  return txt(partes(v)[n]);
}

/**
 * Texto multilínea del sistema viejo ("línea1||línea2||…") → líneas separadas
 * por salto de línea. Se quitan las líneas vacías del final.
 */
export function multilinea(v: unknown): string | null {
  const ps = partes(v);
  while (ps.length > 0 && ps[ps.length - 1] === '') ps.pop();
  if (ps.length === 0) return null;
  return txt(ps.join('\n'));
}

/** Diferencia de Ecuador con UTC (sin horario de verano). */
const ECUADOR_UTC_OFFSET_H = 5;

/**
 * Fecha sola de Access (texto "yyyy/mm/dd", o Date) → Date a las 00:00 UTC,
 * para que el día no se corra al guardarla.
 */
export function fechaDia(v: unknown): Date | null {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime())
      ? null
      : new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  }
  const m = txt(v)?.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

/**
 * Fecha y hora de Access en hora local de Ecuador → Date (UTC). Acepta
 * "yyyy/mm/dd hh:mm[:ss]" (texto), "mm/dd/yyyy hh:mm:ss" y Date/ISO (que
 * node-adodb ya entrega en UTC).
 */
export function fechaHora(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = txt(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  let y: number, mo: number, d: number;
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const [h, mi, se] = [Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)];
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return new Date(Date.UTC(y, mo - 1, d, h + ECUADOR_UTC_OFFSET_H, mi, se));
}

/** Date → literal de fecha de Access (#mm/dd/yyyy hh:nn:ss#) en hora de Ecuador. */
export function literalFechaAccess(d: Date): string {
  const local = new Date(d.getTime() - ECUADOR_UTC_OFFSET_H * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `#${p(local.getUTCMonth() + 1)}/${p(local.getUTCDate())}/${local.getUTCFullYear()} ${p(local.getUTCHours())}:${p(local.getUTCMinutes())}:${p(local.getUTCSeconds())}#`;
}

/** Date → texto "yyyy/mm/dd" (como guarda Access las fechas en texto), en hora de Ecuador. */
export function textoFechaAccess(d: Date): string {
  const local = new Date(d.getTime() - ECUADOR_UTC_OFFSET_H * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}/${p(local.getUTCMonth() + 1)}/${p(local.getUTCDate())}`;
}

/** Parte un arreglo en trozos de `n`. */
export function trozos<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** true si todos los valores del objeto son null/undefined. */
export function todoNulo(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every((v) => v === null || v === undefined);
}

/** JSON con claves ordenadas, para hashear de forma estable. */
export function jsonEstable(v: unknown): string {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return `[${v.map(jsonEstable).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${jsonEstable(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Agrupa filas por una clave. */
export function agrupar<T>(rows: T[], clave: (r: T) => string | null): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = clave(r);
    if (k === null) continue;
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}
