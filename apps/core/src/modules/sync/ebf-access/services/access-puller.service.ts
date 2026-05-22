import { Injectable, Logger } from '@nestjs/common';
import { LegacyDbService } from '../../../integrations/legacy-db/legacy-db.service';
import { normalizeAwb } from '../utils/awb-normalize';
import type { AccessCoordinacionRow } from '../types/sync.types';

interface PinDocCoorRow {
  bodCodigo: number;
  docTipo: string;
  docNumero: number;
  docNumGuia: string | null;
  marCodigo: number | null;
  marAlias: string | null;
  aerCodigo: number | null;
  aerAlias: string | null;
  docFulls: number | null;
  docCajas: number | null;
  docKgs: number | null;
  docFecha: string | null;
  docDestino: string | null;
}

/**
 * Lee coordinaciones recientes de Access (PIN_dDocCoor JOIN PIN_MCoordina)
 * para el ciclo de sync. Solo SELECT — usa `LegacyDbService.queryBridge`.
 *
 * Filtros aplicados:
 *  - Ventana móvil de N días (default 30) sobre `docFecha` para no jalar todo.
 *  - `docNumGuia` no-null (queremos coordinaciones con AWB asignado).
 */
@Injectable()
export class AccessPullerService {
  private readonly logger = new Logger(AccessPullerService.name);

  constructor(private readonly legacyDb: LegacyDbService) {}

  /**
   * Pull de coordinaciones Access en una ventana de fechas.
   * `windowDays` cuenta hacia atrás desde hoy.
   */
  async pullRecentCoordinaciones(
    windowDays = 30,
  ): Promise<AccessCoordinacionRow[]> {
    // Access usa formato #M/D/YYYY# en su SQL — Date() builtin sirve para "hoy".
    // Para evitar dolores de localización, usamos DateAdd con Date():
    //   docFecha >= DateAdd("d", -N, Date())
    const sql = `
      SELECT
        d.bodCodigo, d.docTipo, d.docNumero, d.docNumGuia,
        d.marCodigo, mar.marAlias,
        d.aerCodigo, aer.aerAlias,
        d.docFulls, d.docCajas, d.docKgs,
        m.docFecha, m.docDestino
      FROM ((PIN_dDocCoor AS d
        INNER JOIN PIN_MCoordina AS m
          ON d.bodCodigo = m.bodCodigo
         AND d.docTipo   = m.docTipo
         AND d.docNumero = m.docNumero)
        LEFT JOIN PIN_auxMarcas AS mar      ON d.marCodigo = mar.marCodigo)
        LEFT JOIN PIN_auxAerolineas AS aer  ON d.aerCodigo = aer.aerCodigo
      WHERE m.docFecha >= DateAdd("d", -${windowDays}, Date())
        AND d.docNumGuia IS NOT NULL
        AND d.docNumGuia <> ''
      ORDER BY m.docFecha DESC, d.docNumero DESC
    `;
    const rows = await this.legacyDb.queryBridge<PinDocCoorRow>(sql);
    this.logger.log(
      `[sync/access] pulled ${rows.length} coordinaciones (last ${windowDays} días)`,
    );
    return rows.map((r) => this.toRow(r));
  }

  /**
   * Pull de FUEs (= DAEs) por docNumero — para el match secundario y para
   * llenar EbfDetalleAccessLink. Devuelve mapa docNumero → lista de detalles.
   */
  async pullDetallesByDocNumeros(
    docNumeros: number[],
  ): Promise<
    Map<
      number,
      Array<{
        detNumero: number;
        marCodigo: number | null;
        plaCodigo: number | null;
        proCodigo: string | null;
        detGuiaHija: number | null;
        detFUE: string | null;
        detFull: number | null;
        detCajas: number | null;
        detKgs: number | null;
      }>
    >
  > {
    if (docNumeros.length === 0) return new Map();
    // Chunk para no pasar el largo máximo de SQL de Access (255 params en IN()).
    const CHUNK = 100;
    const out = new Map<number, Awaited<ReturnType<typeof this.queryDetalles>>[number][]>();
    for (let i = 0; i < docNumeros.length; i += CHUNK) {
      const slice = docNumeros.slice(i, i + CHUNK);
      const rows = await this.queryDetalles(slice);
      for (const r of rows) {
        const list = out.get(r.docNumero);
        if (list) list.push(r);
        else out.set(r.docNumero, [r]);
      }
    }
    return out;
  }

  private async queryDetalles(docNumeros: number[]): Promise<
    Array<{
      docNumero: number;
      detNumero: number;
      marCodigo: number | null;
      plaCodigo: number | null;
      proCodigo: string | null;
      detGuiaHija: number | null;
      detFUE: string | null;
      detFull: number | null;
      detCajas: number | null;
      detKgs: number | null;
    }>
  > {
    const ids = docNumeros.map((n) => n.toString()).join(',');
    const sql = `
      SELECT
        docNumero, detNumero, marCodigo, plaCodigo, proCodigo,
        detGuiaHija, detFUE, detFull, detCajas, detKgs
      FROM PIN_DCoordina
      WHERE docNumero IN (${ids})
      ORDER BY docNumero, detNumero
    `;
    return this.legacyDb.queryBridge(sql);
  }

  private toRow(r: PinDocCoorRow): AccessCoordinacionRow {
    return {
      bodCodigo: r.bodCodigo,
      docTipo: r.docTipo,
      docNumero: r.docNumero,
      awbNormalized: normalizeAwb(r.docNumGuia),
      awbRaw: r.docNumGuia,
      marCodigo: r.marCodigo,
      marAlias: r.marAlias,
      aerCodigo: r.aerCodigo,
      aerAlias: r.aerAlias,
      docFulls: r.docFulls,
      docCajas: r.docCajas,
      docKgs: r.docKgs,
      docFecha: r.docFecha,
      docDestino: r.docDestino,
    };
  }
}
