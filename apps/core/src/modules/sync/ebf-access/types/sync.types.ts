/** Fila Access lista para matchear (proyectada de PIN_dDocCoor + PIN_MCoordina). */
export interface AccessCoordinacionRow {
  // Identidad Access compuesta
  bodCodigo: number;
  docTipo: string;
  docNumero: number;
  // Identificadores de match
  /** AWB IATA normalizado sin espacios. */
  awbNormalized: string | null;
  awbRaw: string | null;
  marCodigo: number | null;
  marAlias: string | null;
  aerCodigo: number | null;
  aerAlias: string | null;
  // Métricas
  docFulls: number | null;
  docCajas: number | null;
  docKgs: number | null;
  // Fechas
  docFecha: string | null;
  docDestino: string | null;
}

/** Fila EBF (despacho manager) lista para matchear. */
export interface EbfCoordinacionRow {
  /** id accionable EBF — 387985. */
  detalleId: number;
  /** "EBF100312224" — alternate key. */
  ebfHawbCode: string | null;
  /** AWB IATA normalizado sin espacios. */
  awbNormalized: string;
  awbRaw: string;
  daeNumber: string | null;
  exportadorEbf: string;
  marcacionEbf: string | null;
  productoEbf: string | null;
  // Métricas
  bxsCoo: number | null;
  pcsCoo: number | null;
  bxsWh: number | null;
  pcsWh: number | null;
  // Fechas
  etd: string | null;
  destinoAwb: string | null;
  destinoFinal: string | null;
  creacionFecha: string | null;
  creacionUser: string | null;
}

/** Resultado del matcher para una coordinación EBF. */
export interface MatchResult {
  ebf: EbfCoordinacionRow;
  access: AccessCoordinacionRow[]; // N:1 — varias filas Access pueden corresponder a 1 EBF
  strategy: MatchStrategy;
  confidence: number;
  status: SyncStatus;
  discrepancies?: Record<string, { access: unknown; ebf: unknown }>;
}

export type MatchStrategy =
  | 'AWB_EXACT'
  | 'DAE_ONLY'
  | 'COMPOSITE'
  | 'MANUAL'
  | 'NONE';

export type SyncStatus =
  | 'SYNCED'
  | 'ONLY_ACCESS'
  | 'ONLY_EBF'
  | 'MISMATCH'
  | 'MANUAL_REVIEW'
  | 'IGNORED';

/** Resultado total de un ciclo de sync. */
export interface SyncCycleReport {
  startedAt: string;
  endedAt: string;
  durationMs: number;
  totals: {
    accessRows: number;
    ebfRows: number;
    matched: number;
    onlyAccess: number;
    onlyEbf: number;
    mismatches: number;
    ignored: number;
    upserted: number;
  };
  errors: Array<{ stage: string; message: string }>;
}
