/**
 * Normaliza un AWB IATA quitando espacios para usarlo como key de match.
 * Tres sistemas usan formatos distintos:
 *   - Access docNumGuia:       "157-4665 4543"  (con espacio)
 *   - EBF cliente AWB column:  "157-4665 4543"  (con espacio)
 *   - EBF manager AWB column:  "157-46654543"   (SIN espacio)
 *
 * Match canonical form = sin espacio: "157-46654543".
 */
export function normalizeAwb(awb: string | null | undefined): string | null {
  if (!awb) return null;
  const trimmed = awb.trim();
  if (!trimmed) return null;
  // Quita TODOS los whitespaces internos (puede haber tab, nbsp, multiple spaces)
  return trimmed.replace(/\s+/g, '');
}

/**
 * Extrae el prefijo IATA del AWB (los primeros 3 dígitos) — código del carrier.
 * 157=Qatar, 176=Emirates, 543=Aercaribe, 145=KLM/AF, 074=KLM, 369=?
 */
export function awbCarrierPrefix(awb: string | null | undefined): string | null {
  const normalized = normalizeAwb(awb);
  if (!normalized) return null;
  const m = /^(\d{3})/.exec(normalized);
  return m ? m[1] : null;
}

/**
 * Strippa el prefijo de país (2 chars) de un destino EBF para matchear con
 * desCodigo Access (IATA puro). "KZTSE" → "TSE", "KZALA" → "ALA", "AMS" → "AMS".
 */
export function stripCountryPrefix(
  destino: string | null | undefined,
): string | null {
  if (!destino) return null;
  const t = destino.trim().toUpperCase();
  if (!t) return null;
  if (t.length === 5) return t.slice(2);
  return t;
}

/**
 * Primer token del alias Access — aproxima al alias EBF colapsado.
 * "KAM ZENIT IP HANDLERS NQZ" → "KAM"
 * "RDUHA VOSTOK IP HANDLERS NQZ" → "RDUHA"
 * "BRKAM ZENIT IP HANDLERS NQZ" → "BRKAM"
 *
 * Heurística — siempre validar con EbfCatalogMapping antes de auto-aplicar.
 */
export function consigneeAliasFromAccess(
  marAlias: string | null | undefined,
): string | null {
  if (!marAlias) return null;
  const t = marAlias.trim();
  if (!t) return null;
  const firstToken = t.split(/\s+/)[0];
  return firstToken ? firstToken.toUpperCase() : null;
}
