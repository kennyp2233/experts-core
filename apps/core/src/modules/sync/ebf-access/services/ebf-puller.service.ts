import { Injectable, Logger } from '@nestjs/common';
import { EbfPortalService } from '../../../integrations/ebf-portal/ebf-portal.service';
import { normalizeAwb } from '../utils/awb-normalize';
import type { EbfCoordinacionRow } from '../types/sync.types';

/**
 * Trae la lista de coordinaciones del rol manager (despacho + histórico).
 * Itera páginas hasta que `hasNextPage` sea false o llegue al cap.
 *
 * Filtra por exportador EXPERTS antes de devolver — del lado EBF, el manager
 * ve carga de muchos exportadores. El sync solo debe procesar los nuestros.
 */
@Injectable()
export class EbfPullerService {
  private readonly logger = new Logger(EbfPullerService.name);
  /** Tope defensivo para no recorrer páginas infinitas si el portal devuelve hasNextPage mal. */
  private static readonly MAX_PAGES = 20;

  constructor(private readonly ebf: EbfPortalService) {}

  /**
   * Pull del despacho (activos) — solo coordinaciones del exportador dado.
   * Si `exportadorFilter` es null, devuelve todas (útil para descubrimiento).
   */
  async pullDespacho(
    exportadorFilter: string | null = 'EXPERTS HANDLING CARGO',
  ): Promise<EbfCoordinacionRow[]> {
    return this.pullList(false, exportadorFilter);
  }

  /** Pull del histórico (vuelos pasados) — mismas reglas. */
  async pullHistorico(
    exportadorFilter: string | null = 'EXPERTS HANDLING CARGO',
  ): Promise<EbfCoordinacionRow[]> {
    return this.pullList(true, exportadorFilter);
  }

  private async pullList(
    includeHistorico: boolean,
    exportadorFilter: string | null,
  ): Promise<EbfCoordinacionRow[]> {
    const out: EbfCoordinacionRow[] = [];
    let page = 1;
    let totalSeen = 0;
    let totalMatched = 0;

    while (page <= EbfPullerService.MAX_PAGES) {
      const result = await this.ebf.coordinacion.list({
        page,
        includeHistorico,
      });
      totalSeen += result.items.length;

      for (const item of result.items) {
        const row = this.toRow(item);
        if (!row) continue; // sin detalleId o sin AWB válido — skip
        if (
          exportadorFilter &&
          row.exportadorEbf.toUpperCase() !== exportadorFilter.toUpperCase()
        ) {
          continue;
        }
        out.push(row);
        totalMatched += 1;
      }

      if (!result.hasNextPage) break;
      page += 1;
    }

    this.logger.log(
      `[sync/ebf] ${includeHistorico ? 'histórico' : 'despacho'} — seen=${totalSeen} matched=${totalMatched} (filter=${exportadorFilter ?? 'none'})`,
    );
    return out;
  }

  /** Convierte un CoordinacionListItem en la fila plana para el matcher. */
  private toRow(
    item: import('../../../integrations/ebf-portal/types/coordinacion.types').CoordinacionListItem,
  ): EbfCoordinacionRow | null {
    if (!item.detalleId || !item.awb) return null;
    const detalleId = parseInt(item.detalleId, 10);
    if (!Number.isFinite(detalleId)) return null;
    const awbNormalized = normalizeAwb(item.awb);
    if (!awbNormalized) return null;

    return {
      detalleId,
      ebfHawbCode: item.hawb || null,
      awbNormalized,
      awbRaw: item.awb,
      daeNumber: item.dae || null,
      exportadorEbf: item.exportador ?? '',
      marcacionEbf: item.marcacion,
      productoEbf: item.producto,
      bxsCoo: this.parseNum(item.bxsCoo),
      pcsCoo: this.parseNum(item.pcsCoo),
      bxsWh: this.parseNum(item.bxsWh),
      pcsWh: this.parseNum(item.pcsWh),
      etd: item.etd,
      destinoAwb: item.destinoAwb,
      destinoFinal: item.destinoFinal,
      creacionFecha: item.creacionFecha,
      creacionUser: item.creacionUser,
    };
  }

  private parseNum(s: string | null): number | null {
    if (!s) return null;
    const cleaned = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
}
