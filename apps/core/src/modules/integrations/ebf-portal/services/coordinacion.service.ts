import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfHttpClient } from '../http/ebf-http.client';
import { EbfAuthService } from '../auth/ebf-auth.service';
import { parseCoordinacionList } from '../parsers/coordinacion-list.parser';
import { parseCoordinacionDetalle } from '../parsers/coordinacion-detail.parser';
import type {
  CoordinacionDetalle,
  CoordinacionListPage,
  CoordinacionListQuery,
} from '../types/coordinacion.types';
import type { UpdateCoordinacionDto } from '../dto/update-coordinacion.dto';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

/**
 * Lecturas de la sección de despacho del portal: lista (`/exportador/
 * coordinacion/lista/`) e histórico. La creación de coordinaciones vive en
 * `EbfCoordinacionCreateService` (página `/exportador/detalle_coordinacion/`).
 */
@Injectable()
export class EbfCoordinacionService {
  private readonly logger = new Logger(EbfCoordinacionService.name);
  private readonly cfg: EbfPortalConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfHttpClient,
    private readonly auth: EbfAuthService,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

  async list(query: CoordinacionListQuery = {}): Promise<CoordinacionListPage> {
    await this.auth.ensureSession();
    const basePath = query.includeHistorico
      ? this.cfg.paths.coordinacionHistorico
      : this.cfg.paths.coordinacionLista;
    const qs = this.buildQuery({ page: query.page, sort: query.sort });
    const path = qs ? `${basePath}?${qs}` : basePath;

    const res = await this.withSessionRetry(() =>
      this.http.get(path, { detectAuthRedirect: true }),
    );
    const parsed = parseCoordinacionList(String(res.data ?? ''));
    return {
      items: parsed.items,
      page: parsed.currentPage,
      hasNextPage: parsed.hasNextPage,
      sort: query.sort,
      retrievedAt: new Date().toISOString(),
    };
  }

  async getDetalle(id: string): Promise<CoordinacionDetalle> {
    await this.auth.ensureSession();
    const path = `${this.cfg.paths.coordinacionDetalle}${encodeURIComponent(id)}/`;
    const res = await this.withSessionRetry(() =>
      this.http.get(path, { detectAuthRedirect: true }),
    );
    return parseCoordinacionDetalle(id, String(res.data ?? ''));
  }

  async update(_id: string, _dto: UpdateCoordinacionDto): Promise<never> {
    throw new NotImplementedException(
      'EBF Portal — update coordinación pendiente de mapear (form de edición no capturado todavía).',
    );
  }

  private buildQuery(params: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      sp.append(k, String(v));
    }
    return sp.toString();
  }

  private async withSessionRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'EBF_SESSION_EXPIRED') {
        this.logger.warn('[EBF-PORTAL] session expired — reloging');
        await this.auth.forceRelogin();
        return await fn();
      }
      throw err;
    }
  }
}
