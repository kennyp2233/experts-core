import { r2 } from '../liquidacion';
import { CoordinacionCompleta, igual, redondear, ReglaNegocio } from './tipos';

/** Línea mínima para los cálculos (sirve para Access y para el sistema nuevo). */
export interface LineaCalculo {
  idConsignatario: number | null;
  idFinca: number | null;
  codigoProducto: string | null;
  cantidadCajas: number;
  fulls: number | null;
  pesoKg: number | null;
}

/** Totales físicos de una coordinación = suma de sus líneas. */
export function totalesDeLineas(lineas: LineaCalculo[]) {
  return lineas.reduce(
    (t, l) => ({
      cajas: t.cajas + (l.cantidadCajas ?? 0),
      fulls: redondear(t.fulls + (l.fulls ?? 0), 4),
      kgs: redondear(t.kgs + (l.pesoKg ?? 0), 4),
    }),
    { cajas: 0, fulls: 0, kgs: 0 },
  );
}

/**
 * Volumen en kg volumétricos (R11): Σ por línea de round2(largo × ancho × alto ×
 * fulls / 6000), con las medidas en cm de la caja de la finca. No interviene en
 * el dinero: es informativo (el peso cobrable se digita).
 */
export function volumenDeLineas(
  lineas: Array<{ largo?: number | null; ancho?: number | null; alto?: number | null; fulls: number | null }>,
): number {
  return redondear(
    lineas.reduce((a, l) => a + r2(((l.largo ?? 0) * (l.ancho ?? 0) * (l.alto ?? 0) * (l.fulls ?? 0)) / 6000), 0),
    2,
  );
}

/**
 * Guías hijas que corresponden a un conjunto de líneas: una por
 * consignatario (marca) + finca + producto (regla del sistema viejo, ver
 * legacy-analysis SAC2inv.Proc_651440; con `parNGHxProducto = 0` sería sin
 * producto).
 */
export function claveGuiaHija(l: LineaCalculo, porProducto = true): string {
  return [l.idConsignatario ?? '-', l.idFinca ?? '-', porProducto ? (l.codigoProducto ?? '-') : ''].join('|');
}

export function agruparEnGuiasHijas<T extends LineaCalculo>(lineas: T[], porProducto = true): Map<string, T[]> {
  const g = new Map<string, T[]>();
  for (const l of lineas) {
    const k = claveGuiaHija(l, porProducto);
    const list = g.get(k);
    if (list) list.push(l);
    else g.set(k, [l]);
  }
  return g;
}

const lineas = (c: CoordinacionCompleta) => c.guiaHijas.flatMap((g) => g.detalles);

export const reglaTotalCajas: ReglaNegocio = {
  id: 'totales.cajas',
  nombre: 'Total de cajas',
  descripcion: 'Cajas de la coordinación = suma de las cajas de sus líneas.',
  evaluar: (c) => {
    if (c.totalCajas === null) return null;
    const t = totalesDeLineas(lineas(c));
    return { ok: igual(t.cajas, c.totalCajas, 0.001), esperado: c.totalCajas, calculado: t.cajas };
  },
};

export const reglaTotalFulls: ReglaNegocio = {
  id: 'totales.fulls',
  nombre: 'Total de fulls',
  descripcion: 'Fulls de la coordinación = suma de los fulls de sus líneas.',
  evaluar: (c) => {
    if (c.totalFulls === null) return null;
    const t = totalesDeLineas(lineas(c));
    return { ok: igual(t.fulls, c.totalFulls, 0.001), esperado: c.totalFulls, calculado: t.fulls };
  },
};

export const reglaTotalKgs: ReglaNegocio = {
  id: 'totales.kgs',
  nombre: 'Peso bruto total',
  descripcion: 'Kg de la coordinación = suma de los kg de sus líneas.',
  evaluar: (c) => {
    if (c.totalKgs === null) return null;
    const t = totalesDeLineas(lineas(c));
    return { ok: igual(t.kgs, c.totalKgs, 0.01), esperado: c.totalKgs, calculado: t.kgs };
  },
};

export const reglaVolumen: ReglaNegocio = {
  id: 'totales.volumen',
  nombre: 'Volumen',
  descripcion: 'Volumen = Σ largo × ancho × alto × fulls / 6000 por línea (±0.05: el sistema viejo redondea distinto los …5).',
  evaluar: (c) => {
    if (c.totalVolumen === null) return null;
    const v = volumenDeLineas(lineas(c));
    return { ok: igual(v, c.totalVolumen, 0.05), esperado: c.totalVolumen, calculado: v };
  },
};

export const reglaAgrupacionGuiasHijas: ReglaNegocio = {
  id: 'guiasHijas.agrupacion',
  nombre: 'Agrupación en guías hijas',
  descripcion: 'Una guía hija por consignatario + finca + producto: cuántas guías hijas salen y cuáles líneas van juntas.',
  evaluar: (c) => {
    const ls = c.guiaHijas.flatMap((g) => g.detalles.map((d) => ({ ...d, ngh: g.numeroGuiaHija })));
    if (ls.length === 0) return null;
    const grupos = agruparEnGuiasHijas(ls);
    // Cada grupo calculado debe caer en una sola guía hija real y viceversa.
    const nghPorGrupo = [...grupos.values()].map((g) => new Set(g.map((l) => l.ngh)).size);
    const ok = grupos.size === c.guiaHijas.length && nghPorGrupo.every((n) => n === 1);
    return {
      ok,
      esperado: c.guiaHijas.length,
      calculado: grupos.size,
      nota: ok ? undefined : 'El sistema viejo agrupó distinto (líneas de un mismo grupo en varias guías hijas o al revés).',
    };
  },
};

export const REGLAS_TOTALES: ReglaNegocio[] = [
  reglaTotalCajas,
  reglaTotalFulls,
  reglaTotalKgs,
  reglaVolumen,
  reglaAgrupacionGuiasHijas,
];
