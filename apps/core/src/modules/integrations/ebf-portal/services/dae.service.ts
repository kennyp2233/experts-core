import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfHttpClient } from '../http/ebf-http.client';
import { EbfAuthService } from '../auth/ebf-auth.service';
import { parseDaeList } from '../parsers/dae-list.parser';
import type { DaeListPage } from '../types/dae.types';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

@Injectable()
export class EbfDaeService {
  private readonly logger = new Logger(EbfDaeService.name);
  private readonly cfg: EbfPortalConfig;
  /** Columnas ya reportadas como vacías — loguear una sola vez por proceso. */
  private readonly warnedEmptyColumns = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfHttpClient,
    private readonly auth: EbfAuthService,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

  /**
   * Lista DAEs. Las columnas reales se descubren en runtime (mañana las
   * fijamos como TypedKeys cuando confirmemos el HTML logueado). Por ahora
   * devolvemos un raw map column-name → value.
   */
  async list(
    query: { page?: number } = {},
  ): Promise<DaeListPage & { columns: string[] }> {
    await this.auth.ensureSession();
    const qs = query.page ? `?page=${encodeURIComponent(String(query.page))}` : '';
    const res = await this.http.get(
      `${this.cfg.paths.daesLista}${qs}`,
      { detectAuthRedirect: true },
    );
    const html = String(res.data ?? '');
    const currentPage = query.page ?? 1;
    const parsed = parseDaeList(html, currentPage);

    for (const { column, sampleHtml } of parsed.emptyColumns) {
      if (this.warnedEmptyColumns.has(column)) continue;
      this.warnedEmptyColumns.add(column);
      this.logger.warn(
        `[EBF-PORTAL] DAEs: columna "${column}" vacía en todas las filas (¿ícono/markup no reconocido?). Muestra: ${sampleHtml}`,
      );
    }

    return {
      items: parsed.items,
      page: currentPage,
      hasNextPage: parsed.hasNextPage,
      retrievedAt: new Date().toISOString(),
      columns: parsed.columns,
    };
  }
}
