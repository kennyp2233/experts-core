/**
 * Liquidación de una coordinación (flete y cargos). Las fórmulas replican las
 * del sistema viejo (pantalla Coordinación, ver legacy-analysis/reglas/liquidacion.md)
 * y se validan contra lo que guardó Access en `ValidacionService`.
 *
 * Cada coordinación tiene un juego NORMAL y, si se cortó con "corte extra", un
 * juego CORTE_EXTRA; los totales guardados salen del juego vigente (R1).
 *
 * Ojo con los nombres de Access: `docDA` guarda los cargos de AEROLÍNEA (IATA:
 * "due carrier") y `docDC` los de AGENCIA ("due agent"). Aquí se usan los
 * nombres IATA: dueCarrier = cargos aerolínea, dueAgent = cargos agencia.
 */

export interface ValoresLiquidacion {
  pesoCobrable: number | null;
  tarifa: number | null;
  guiaAerea: number | null;
  combustible: number | null;
  seguridad: number | null;
  otros: number | null;
  iva: number | null;
  /** Σ cargos de agencia (extHandling). Se recalcula siempre desde los códigos. */
  handling: number | null;
  cargoAwa: number | null;
  cargoCha: number | null;
  cargoPca: number | null;
  cargoTax: number | null;
  cargoMma: number | null;
  cargoHawb: number | null;
  cargoFitos: number | null;
  aux1: number | null;
  aux2: number | null;
  /** Handling de Experts al cliente (cliHandling). No entra en el total de la guía. */
  aux3Handling: number | null;
  calAux: number | null;
  auxOtros: number | null;
  tarifaAcordada: number | null;
}

export interface ResumenLiquidacion {
  pesoCobrable: number | null;
  tarifa: number | null;
  /** R3: peso cobrable × tarifa. */
  flete: number | null;
  /** R4 (docDA): guía aérea + combustible + seguridad + otros + aux1 + aux2 + calc. aux. */
  dueCarrier: number;
  /** R5 (docDC): suma de los 7 códigos de agencia. */
  dueAgent: number;
  iva: number;
  /** R6: flete + due carrier + IVA + due agent. */
  total: number | null;
}

/** Códigos de agencia en el orden de la pantalla vieja (CODAGE0..6). */
export const CODIGOS_AGENCIA = ['cargoAwa', 'cargoCha', 'cargoPca', 'cargoTax', 'cargoMma', 'cargoHawb', 'cargoFitos'] as const;
/** Conceptos que suman al due carrier (cargos de aerolínea). */
export const CONCEPTOS_AEROLINEA = ['guiaAerea', 'combustible', 'seguridad', 'otros', 'aux1', 'aux2', 'calAux'] as const;

/**
 * Redondeo half-up a 2 decimales como `Format(x, "0.00")` de VB. El épsilon
 * absorbe el ruido binario (1.005 × 100 = 100.49999…) y el float32 de Access.
 */
export const r2 = (n: number): number => (Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-6)) / 100;
const suma = (v: Partial<Record<string, number | null>>, ks: readonly string[]) =>
  ks.reduce((a, k) => a + (v[k] ?? 0), 0);

/** R5: Σ códigos de agencia (lo que Access guarda en extHandling / docDC). */
export const cargosAgencia = (v: Partial<ValoresLiquidacion>): number => r2(suma(v, CODIGOS_AGENCIA));
/** R4: Σ conceptos de aerolínea (docDA). El IVA va aparte. */
export const cargosAerolinea = (v: Partial<ValoresLiquidacion>): number => r2(suma(v, CONCEPTOS_AEROLINEA));

export function resumirLiquidacion(v: ValoresLiquidacion): ResumenLiquidacion {
  const flete = v.pesoCobrable !== null && v.tarifa !== null ? r2(v.pesoCobrable * v.tarifa) : null;
  const dueCarrier = cargosAerolinea(v);
  const dueAgent = cargosAgencia(v);
  const iva = r2(v.iva ?? 0);
  return {
    pesoCobrable: v.pesoCobrable,
    tarifa: v.tarifa === null ? null : r2(v.tarifa),
    flete,
    dueCarrier,
    dueAgent,
    iva,
    total: flete === null ? null : r2(flete + dueCarrier + iva + dueAgent),
  };
}

/** R1: el juego que alimenta los totales (corte extra si existe y está marcado). */
export function juegoVigente<T extends { tipo: string }>(liquidaciones: T[], corteExtra: boolean): T | undefined {
  const normal = liquidaciones.find((l) => l.tipo === 'NORMAL');
  return corteExtra ? (liquidaciones.find((l) => l.tipo === 'CORTE_EXTRA') ?? normal) : normal;
}

/** Concepto de aerolínea configurado en datos maestros (AerolineaConcepto). */
export interface ConceptoAerolinea {
  /** Campo de la liquidación que llena. */
  campo: (typeof CONCEPTOS_AEROLINEA)[number] | 'iva';
  valor: number;
  /** true → valor por kg; false → monto fijo por guía. */
  porPeso: boolean;
  /** Si es por kg: true → sobre peso cobrable, false → sobre peso bruto (aerCodNPeso). */
  sobrePesoCobrable: boolean;
}

/**
 * R13: valores por defecto de los conceptos de aerolínea al coordinar (el
 * usuario los puede editar). Fijos por guía o por kg sobre peso cobrable o bruto.
 */
export function defaultsAerolinea(
  conceptos: ConceptoAerolinea[],
  pesoBruto: number,
  pesoCobrable: number | null,
): Partial<ValoresLiquidacion> {
  const out: Partial<ValoresLiquidacion> = {};
  for (const c of conceptos) {
    const base = c.sobrePesoCobrable ? (pesoCobrable ?? pesoBruto) : pesoBruto;
    out[c.campo] = c.porPeso ? r2(c.valor * base) : r2(c.valor);
  }
  return out;
}
