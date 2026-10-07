import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfHttpClient } from '../http/ebf-http.client';
import { EbfAuthService } from '../auth/ebf-auth.service';
import { parseSelectOptions } from '../parsers/select-options.parser';
import { parseVueloCard } from '../parsers/vuelo-card.parser';
import type {
  SelectOption,
  VueloCard,
} from '../types/coordinacion-create.types';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

const EXPORTADORES_TTL_MS = 10 * 60 * 1000;

/**
 * Cascade de la página `/exportador/detalle_coordinacion/`:
 *   exportador → marcación → vuelo → DAE → card de vuelo.
 *
 * Replica la orquestación del [selection_form.js](../research/selection_form.js)
 * pero del lado server. Todos los endpoints son GET read-only — no
 * requieren ventana operativa.
 */
@Injectable()
export class EbfCoordinacionSelectionService {
  private readonly logger = new Logger(EbfCoordinacionSelectionService.name);
  private readonly cfg: EbfPortalConfig;
  private exportadoresCache: { at: number; options: SelectOption[] } | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfHttpClient,
    private readonly auth: EbfAuthService,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

  /**
   * Lista exportadores disponibles — se sacan del `<select name="exportador">`
   * de la página completa (SIN `HX-Request`: con ese header el portal devuelve
   * solo la tabla parcial).
   *
   * El portal movió el formulario de coordinar a la lista de despacho:
   * `/exportador/detalle_coordinacion/` ahora responde 302 (body vacío) a
   * `/exportador/coordinacion/lista/`, que es donde vive el select. Se prueba
   * primero la lista y queda la página vieja como respaldo.
   *
   * El catálogo casi no cambia: se cachea 10 min en memoria (solo si trae datos).
   */
  async listExportadores(): Promise<SelectOption[]> {
    if (
      this.exportadoresCache &&
      Date.now() - this.exportadoresCache.at < EXPORTADORES_TTL_MS
    ) {
      return this.exportadoresCache.options;
    }
    await this.auth.ensureSession();
    for (const path of [this.cfg.paths.coordinacionLista, this.cfg.paths.coordinarPage]) {
      const html = await this.fetchHtml(path, {}, { htmx: false });
      const selectBody = this.extractSelectBody(html, 'exportador');
      if (selectBody) {
        const options = parseSelectOptions(selectBody);
        if (options.length > 0) {
          this.exportadoresCache = { at: Date.now(), options };
          return options;
        }
      }
    }
    this.logger.warn('[EBF-PORTAL] No se encontró el select de exportadores en el portal.');
    return [];
  }

  async listMarcaciones(exportadorId: number): Promise<SelectOption[]> {
    return this.fetchOptions(this.cfg.paths.populateMarcacion, {
      exportador: String(exportadorId),
    });
  }

  async listVuelos(
    exportadorId: number,
    marcacionId: number,
  ): Promise<SelectOption[]> {
    return this.fetchOptions(this.cfg.paths.populateVuelo, {
      exportador: String(exportadorId),
      consignatario_marcacion: String(marcacionId),
    });
  }

  async listDaes(
    exportadorId: number,
    marcacionId: number,
    docCoordinacionId: number,
  ): Promise<SelectOption[]> {
    return this.fetchOptions(this.cfg.paths.populateDae, {
      exportador: String(exportadorId),
      consignatario_marcacion: String(marcacionId),
      doc_coordinacion: String(docCoordinacionId),
    });
  }

  async getVueloCard(args: {
    exportadorId: number;
    marcacionId: number;
    vueloId: number;
    daeId?: number;
  }): Promise<VueloCard> {
    await this.auth.ensureSession();
    const html = await this.fetchHtml(this.cfg.paths.vueloCard, {
      vuelo: String(args.vueloId),
      consignatario_marcacion: String(args.marcacionId),
      exportador: String(args.exportadorId),
      dae: args.daeId != null ? String(args.daeId) : '',
    });
    return parseVueloCard(html);
  }

  private async fetchOptions(
    path: string,
    params: Record<string, string>,
  ): Promise<SelectOption[]> {
    await this.auth.ensureSession();
    const html = await this.fetchHtml(path, params);
    return parseSelectOptions(html);
  }

  /**
   * GET con la sesión manager. Por default como request HTMX (los populate_*
   * y el card de vuelo son fragmentos htmx); `htmx: false` para páginas
   * completas.
   */
  private async fetchHtml(
    path: string,
    params: Record<string, string> = {},
    opts: { htmx?: boolean } = {},
  ): Promise<string> {
    const qs = this.buildQuery(params);
    const url = qs ? `${path}?${qs}` : path;
    const referer = `${this.http.baseUrl}${this.cfg.paths.coordinarPage}`;
    const htmx = opts.htmx ?? true;
    const res = await this.withSessionRetry(() =>
      this.http.get(url, { detectAuthRedirect: true, htmx, referer }),
    );
    return String(res.data ?? '');
  }

  private extractSelectBody(html: string, name: string): string | null {
    const rx = new RegExp(
      `<select\\b[^>]*\\bname=["']${name}["'][^>]*>([\\s\\S]*?)<\\/select>`,
      'i',
    );
    const m = rx.exec(html);
    return m ? m[1] : null;
  }

  private buildQuery(params: Record<string, string>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.append(k, v);
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
