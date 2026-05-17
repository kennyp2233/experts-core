import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfHttpClient } from '../http/ebf-http.client';
import { EbfAuthService } from '../auth/ebf-auth.service';
import { parseCoordinacionList } from '../parsers/coordinacion-list.parser';
import { parseCoordinacionDetalle } from '../parsers/coordinacion-detail.parser';
import {
  COORDINACION_WINDOWS,
  describeWindows,
  isWithinWindow,
} from '../utils/horarios.util';
import type {
  CoordinacionDetalle,
  CoordinacionListPage,
  CoordinacionListQuery,
} from '../types/coordinacion.types';
import type { CreateCoordinacionDto } from '../dto/create-coordinacion.dto';
import type { UpdateCoordinacionDto } from '../dto/update-coordinacion.dto';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

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

  async create(_dto: CreateCoordinacionDto): Promise<never> {
    this.assertCoordinacionWindow();
    throw new NotImplementedException(
      'EBF Portal — create coordinación pendiente. Mapear form en horario operativo (ver EBF_PORTAL_TOMORROW.md).',
    );
  }

  async update(_id: string, _dto: UpdateCoordinacionDto): Promise<never> {
    this.assertCoordinacionWindow();
    throw new NotImplementedException(
      'EBF Portal — update coordinación pendiente. Mapear form en horario operativo (ver EBF_PORTAL_TOMORROW.md).',
    );
  }

  /**
   * Lanza si no estamos dentro de la ventana de coordinación. Las
   * operaciones de lectura no la requieren — solo writes.
   */
  private assertCoordinacionWindow(): void {
    const inside = isWithinWindow(COORDINACION_WINDOWS, this.cfg.timezone);
    if (!inside) {
      this.logger.warn(
        `[EBF-PORTAL] write attempt outside coordinación window (${describeWindows(COORDINACION_WINDOWS)} ${this.cfg.timezone})`,
      );
      throw new NotImplementedException(
        `Portal EBF fuera de ventana de coordinación. Ventanas: ${describeWindows(COORDINACION_WINDOWS)} (${this.cfg.timezone}).`,
      );
    }
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
