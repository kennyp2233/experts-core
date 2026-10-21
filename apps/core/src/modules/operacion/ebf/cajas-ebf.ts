/**
 * Cajas por tamaño como las pide EBF ("Se coordinará en Piezas, de acuerdo al
 * tamaño de caja"): FB = full (1), HB = tabaco (½), QB = cuarto (¼), EB = octavo (⅛).
 * En la coordinación cada línea trae cajas y fulls, y casi siempre su tipo de
 * caja; el 7 % de las líneas de 2026 mezcla tamaños (p. ej. 0,75 fulls en 2
 * cajas = 1 HB + 1 QB) y hay que separarlas.
 */
export type TipoCajaEbf = 'FB' | 'HB' | 'QB' | 'EB';

export type CajasPorTipo = Record<TipoCajaEbf, number>;

export const FACTOR_FULL: Record<TipoCajaEbf, number> = { FB: 1, HB: 0.5, QB: 0.25, EB: 0.125 };

const TIPOS: TipoCajaEbf[] = ['FB', 'HB', 'QB', 'EB'];

export const cajasVacias = (): CajasPorTipo => ({ FB: 0, HB: 0, QB: 0, EB: 0 });

export const totalCajas = (c: CajasPorTipo): number => TIPOS.reduce((s, t) => s + c[t], 0);

export const totalFulls = (c: CajasPorTipo): number =>
  Math.round(TIPOS.reduce((s, t) => s + c[t] * FACTOR_FULL[t], 0) * 1000) / 1000;

export const sumarCajas = (a: CajasPorTipo, b: CajasPorTipo): CajasPorTipo => ({
  FB: a.FB + b.FB,
  HB: a.HB + b.HB,
  QB: a.QB + b.QB,
  EB: a.EB + b.EB,
});

export const restarCajas = (a: CajasPorTipo, b: CajasPorTipo): CajasPorTipo => ({
  FB: a.FB - b.FB,
  HB: a.HB - b.HB,
  QB: a.QB - b.QB,
  EB: a.EB - b.EB,
});

export const algunaNegativa = (c: CajasPorTipo): boolean => TIPOS.some((t) => c[t] < 0);

export const esTipoCaja = (s: string | null | undefined): s is TipoCajaEbf => !!s && (TIPOS as string[]).includes(s);

/** "2 HB + 1 QB" */
export function describirCajas(c: CajasPorTipo): string {
  const partes = TIPOS.filter((t) => c[t] !== 0).map((t) => `${c[t]} ${t}`);
  return partes.length ? partes.join(' + ') : '0';
}

/**
 * Separa `cajas` cajas que suman `fulls` en tamaños. Si se conoce el tipo de
 * la línea y cuadra, es ese. Si no, busca la combinación con menos tamaños
 * distintos (preferencia HB, QB, FB, EB: los de uso real). null si no hay
 * combinación exacta (datos inconsistentes).
 */
export function separarCajas(fulls: number, cajas: number, tipo?: string | null): CajasPorTipo | null {
  if (cajas <= 0) return fulls > 0 ? null : cajasVacias();
  const octavos = Math.round(fulls * 8);
  if (Math.abs(octavos / 8 - fulls) > 0.001) return null;
  if (esTipoCaja(tipo) && Math.round(cajas * FACTOR_FULL[tipo] * 8) === octavos) {
    return { ...cajasVacias(), [tipo]: cajas };
  }
  // Un solo tamaño
  for (const t of ['HB', 'QB', 'FB', 'EB'] as TipoCajaEbf[]) {
    if (cajas * FACTOR_FULL[t] * 8 === octavos) return { ...cajasVacias(), [t]: cajas };
  }
  // Dos tamaños: a cajas de t1 y (cajas − a) de t2
  const pares: Array<[TipoCajaEbf, TipoCajaEbf]> = [
    ['HB', 'QB'],
    ['FB', 'HB'],
    ['QB', 'EB'],
    ['HB', 'EB'],
    ['FB', 'QB'],
    ['FB', 'EB'],
  ];
  for (const [t1, t2] of pares) {
    const o1 = FACTOR_FULL[t1] * 8;
    const o2 = FACTOR_FULL[t2] * 8;
    // a·o1 + (cajas − a)·o2 = octavos  →  a = (octavos − cajas·o2) / (o1 − o2)
    const a = (octavos - cajas * o2) / (o1 - o2);
    if (Number.isInteger(a) && a > 0 && a < cajas) {
      return { ...cajasVacias(), [t1]: a, [t2]: cajas - a };
    }
  }
  // Tres o cuatro tamaños: búsqueda acotada (las líneas reales son chicas)
  if (cajas > 200) return null;
  for (let fb = 0; fb <= cajas; fb++) {
    for (let hb = 0; hb + fb <= cajas; hb++) {
      for (let qb = 0; qb + hb + fb <= cajas; qb++) {
        const eb = cajas - fb - hb - qb;
        if (fb * 8 + hb * 4 + qb * 2 + eb === octavos) return { FB: fb, HB: hb, QB: qb, EB: eb };
      }
    }
  }
  return null;
}
