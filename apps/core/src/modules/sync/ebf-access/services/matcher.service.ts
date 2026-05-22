import { Injectable, Logger } from '@nestjs/common';
import type {
  AccessCoordinacionRow,
  EbfCoordinacionRow,
  MatchResult,
  MatchStrategy,
  SyncStatus,
} from '../types/sync.types';

/**
 * Algoritmo de match Access ↔ EBF. Devuelve un MatchResult por coordinación
 * EBF (anclados a `detalleId` EBF, granularidad N:1 Access:EBF).
 *
 * Ancla principal: AWB normalizado sin espacios (ver ACCESS_EBF_SYNC.md §3).
 * Backup: ninguno por ahora — DAE/FUE cruzan a nivel detalle, no header,
 * y no tenemos `detalles` cargados en el matcher de header (sale en F1.5).
 *
 * Genera también discrepancias en BXS/PCS cuando los números cuadran <1%.
 * El status final lo decide cada caller (este matcher solo clasifica).
 */
@Injectable()
export class MatcherService {
  private readonly logger = new Logger(MatcherService.name);
  /** Tolerancia para decir "cuadra" en métricas (1% relativo o 0.01 absoluto). */
  private static readonly METRIC_EPS = 0.01;

  /**
   * Matchea cada fila EBF contra el set de filas Access. Devuelve un
   * MatchResult por cada fila EBF (incluyendo las que no matchearon).
   * Las filas Access no usadas las retorna el caller via `findOnlyAccess`.
   */
  matchEbfToAccess(
    ebfRows: EbfCoordinacionRow[],
    accessRows: AccessCoordinacionRow[],
  ): MatchResult[] {
    // Index Access by awbNormalized para lookup O(1)
    const accessByAwb = new Map<string, AccessCoordinacionRow[]>();
    for (const a of accessRows) {
      if (!a.awbNormalized) continue;
      const list = accessByAwb.get(a.awbNormalized);
      if (list) list.push(a);
      else accessByAwb.set(a.awbNormalized, [a]);
    }

    return ebfRows.map((ebf) => this.matchOne(ebf, accessByAwb));
  }

  /**
   * Filas Access que no tienen contraparte EBF. Es la otra mitad de los
   * buckets (ONLY_ACCESS) que el matcher no devuelve por defecto.
   */
  findOnlyAccess(
    accessRows: AccessCoordinacionRow[],
    matchedEbf: MatchResult[],
  ): AccessCoordinacionRow[] {
    const matchedKeys = new Set<string>();
    for (const m of matchedEbf) {
      for (const a of m.access) {
        matchedKeys.add(this.accessKey(a));
      }
    }
    return accessRows.filter((a) => !matchedKeys.has(this.accessKey(a)));
  }

  private matchOne(
    ebf: EbfCoordinacionRow,
    accessByAwb: Map<string, AccessCoordinacionRow[]>,
  ): MatchResult {
    const candidates = accessByAwb.get(ebf.awbNormalized) ?? [];

    if (candidates.length === 0) {
      return {
        ebf,
        access: [],
        strategy: 'NONE',
        confidence: 0,
        status: 'ONLY_EBF',
      };
    }

    const strategy: MatchStrategy = 'AWB_EXACT';
    const confidence = 1.0;
    const discrepancies = this.computeDiscrepancies(ebf, candidates);
    const status: SyncStatus =
      Object.keys(discrepancies).length > 0 ? 'MISMATCH' : 'SYNCED';

    return {
      ebf,
      access: candidates,
      strategy,
      confidence,
      status,
      ...(Object.keys(discrepancies).length > 0 ? { discrepancies } : {}),
    };
  }

  /**
   * Compara métricas BXS-COO / PCS-COO entre EBF y la suma de Access.
   * Pesos NO se comparan acá — divergen sistemáticamente por diseño
   * (Access neto vs EBF gross) y se reportan en otra capa si interesa.
   */
  private computeDiscrepancies(
    ebf: EbfCoordinacionRow,
    accessRows: AccessCoordinacionRow[],
  ): Record<string, { access: unknown; ebf: unknown }> {
    const out: Record<string, { access: unknown; ebf: unknown }> = {};
    const accessSum = accessRows.reduce(
      (acc, r) => ({
        fulls: acc.fulls + (r.docFulls ?? 0),
        cajas: acc.cajas + (r.docCajas ?? 0),
      }),
      { fulls: 0, cajas: 0 },
    );

    if (
      ebf.bxsCoo != null &&
      !this.numbersMatch(accessSum.fulls, ebf.bxsCoo)
    ) {
      out.bxsCoo = { access: accessSum.fulls, ebf: ebf.bxsCoo };
    }
    if (
      ebf.pcsCoo != null &&
      !this.numbersMatch(accessSum.cajas, ebf.pcsCoo)
    ) {
      out.pcsCoo = { access: accessSum.cajas, ebf: ebf.pcsCoo };
    }
    return out;
  }

  private numbersMatch(a: number, b: number): boolean {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    if (diff <= MatcherService.METRIC_EPS) return true;
    // 1% relativo
    const base = Math.max(Math.abs(a), Math.abs(b));
    return base > 0 && diff / base <= 0.01;
  }

  private accessKey(a: AccessCoordinacionRow): string {
    return `${a.bodCodigo}|${a.docTipo}|${a.docNumero}`;
  }
}
