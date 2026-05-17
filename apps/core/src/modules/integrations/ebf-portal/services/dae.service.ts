import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfHttpClient } from '../http/ebf-http.client';
import { EbfAuthService } from '../auth/ebf-auth.service';
import type { DaeListPage } from '../types/dae.types';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

const TR_RX = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const TD_RX = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
const TH_RX = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
const PAGE_RX = /hx-get=["']\?page=(\d+)["']/g;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

@Injectable()
export class EbfDaeService {
  private readonly logger = new Logger(EbfDaeService.name);
  private readonly cfg: EbfPortalConfig;

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

    const headers: string[] = [];
    TH_RX.lastIndex = 0;
    let h: RegExpExecArray | null;
    while ((h = TH_RX.exec(html)) !== null) {
      const txt = stripHtml(h[1]);
      if (txt) headers.push(txt);
    }

    const items: DaeListPage['items'] = [];
    TR_RX.lastIndex = 0;
    let row: RegExpExecArray | null;
    while ((row = TR_RX.exec(html)) !== null) {
      const rowHtml = row[1];
      if (!/<td\b/i.test(rowHtml)) continue;
      const tds: string[] = [];
      TD_RX.lastIndex = 0;
      let t: RegExpExecArray | null;
      while ((t = TD_RX.exec(rowHtml)) !== null) tds.push(stripHtml(t[1]));
      if (tds.length === 0) continue;
      const raw: Record<string, string> = {};
      tds.forEach((v, i) => {
        const key = headers[i] ?? `col${i}`;
        raw[key] = v;
      });
      items.push({ raw });
    }

    const pageNums = new Set<number>();
    let m: RegExpExecArray | null;
    PAGE_RX.lastIndex = 0;
    while ((m = PAGE_RX.exec(html)) !== null) pageNums.add(parseInt(m[1], 10));
    const maxPage = pageNums.size ? Math.max(...pageNums) : 1;
    const currentPage = query.page ?? 1;

    return {
      items,
      page: currentPage,
      hasNextPage: maxPage > currentPage,
      retrievedAt: new Date().toISOString(),
      columns: headers,
    };
  }
}
