import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfHttpClient } from '../http/ebf-http.client';
import { EbfAuthService } from '../auth/ebf-auth.service';
import {
  extractUpdateErrors,
  parseUpdateModal,
} from '../parsers/coordinacion-update-modal.parser';
import {
  COORDINACION_WINDOWS,
  describeWindows,
  isWithinWindow,
} from '../utils/horarios.util';
import type {
  DeleteCoordinacionResult,
  UpdateCoordinacionResult,
  UpdateFormSpec,
} from '../types/coordinacion-update.types';
import type { ProductoOption } from '../types/coordinacion-create.types';
import type { UpdateCoordinacionDto } from '../dto/update-coordinacion.dto';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

@Injectable()
export class EbfCoordinacionUpdateService {
  private readonly logger = new Logger(EbfCoordinacionUpdateService.name);
  private readonly cfg: EbfPortalConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfHttpClient,
    private readonly auth: EbfAuthService,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

  /**
   * GET del modal de edición. Read-only — no aplica ventana operativa.
   * El back-portal sí valida que la coordinación sea del día actual y
   * devuelve 404 si no — el caller debe manejarlo.
   */
  async getUpdateForm(detalleId: number): Promise<UpdateFormSpec> {
    await this.auth.ensureSession();
    const path = this.updatePath(detalleId);
    const res = await this.withSessionRetry(() =>
      this.http.get(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: this.coordinarReferer(),
        headers: { 'HX-Target': 'htmxDialog' },
      }),
    );
    return parseUpdateModal(detalleId, String(res.data ?? ''));
  }

  /**
   * Update de una coordinación existente. Flujo:
   *   1. Ventana operativa.
   *   2. GET modal para sacar csrf fresco + validar producto.
   *   3. Cálculo bxs/pcs vía el portal (mismo endpoint que create).
   *   4. POST update.
   */
  async updateCoordinacion(
    detalleId: number,
    dto: UpdateCoordinacionDto,
  ): Promise<UpdateCoordinacionResult> {
    this.assertCoordinacionWindow();
    const spec = await this.getUpdateForm(detalleId);

    // Validar producto si viene en el DTO (y no está locked)
    let effectiveProductoId =
      dto.productoId ?? spec.currentProductoId ?? null;
    if (spec.productoLocked && dto.productoId != null) {
      this.logger.warn(
        `[EBF-PORTAL] productoId ignorado para detalleId=${detalleId} — está locked en el portal (transacciones WH).`,
      );
      effectiveProductoId = spec.currentProductoId;
    }
    if (effectiveProductoId == null) {
      throw new BadRequestException(
        'No hay producto resuelto para esta coordinación (ni en DTO ni en spec).',
      );
    }
    const producto = this.findProducto(spec, effectiveProductoId);
    this.validateAgainstProducto(dto, producto);

    const fbCoo = producto.isFullBxs ? (dto.fbCoo ?? 0) : 0;
    // Recalcular bxs/pcs server-side
    const { data: calc } = await this.http.postJson<{
      bxs_coo: number;
      pcs_coo: number;
    }>(
      this.cfg.paths.boxWeightCalculator,
      {
        fb_coo: fbCoo,
        hb_coo: dto.hbCoo,
        qb_coo: dto.qbCoo,
        eb_coo: dto.ebCoo,
      },
      {
        detectAuthRedirect: true,
        htmx: true,
        referer: this.coordinarReferer(),
      },
    );

    const body = this.buildUpdateBody(
      detalleId,
      effectiveProductoId,
      dto,
      spec,
      { fbCoo, bxsCoo: calc.bxs_coo, pcsCoo: calc.pcs_coo },
    );

    this.logger.log(
      `[EBF-PORTAL] update detalleId=${detalleId} prod=${effectiveProductoId} fb=${fbCoo} hb=${dto.hbCoo} qb=${dto.qbCoo} eb=${dto.ebCoo}`,
    );

    const res = await this.withSessionRetry(() =>
      this.http.postForm(this.updatePath(detalleId), body, {
        detectAuthRedirect: true,
        htmx: true,
        referer: this.coordinarReferer(),
        headers: { 'HX-Target': 'htmxDialog' },
      }),
    );

    const html = String(res.data ?? '');
    if (res.status === 302) {
      return {
        ok: true,
        status: 302,
        redirectTo: String(res.headers['location'] ?? '') || null,
      };
    }
    const errors = extractUpdateErrors(html);
    return {
      ok: errors.length === 0 && res.status >= 200 && res.status < 300,
      status: res.status,
      errors,
      rawHtml: html,
    };
  }

  /**
   * Delete — POST a `/exportador/detalle/<id>/delete/` (no `/coordinacion/`).
   * El modal de confirmación se inspecciona para extraer el csrf; el body
   * solo lleva csrfmiddlewaretoken.
   */
  async deleteCoordinacion(
    detalleId: number,
  ): Promise<DeleteCoordinacionResult> {
    this.assertCoordinacionWindow();
    await this.auth.ensureSession();

    // GET del modal de confirmación — necesario para sacar el csrf fresco
    const path = this.deletePath(detalleId);
    const confirmRes = await this.withSessionRetry(() =>
      this.http.get(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: this.coordinarReferer(),
        headers: { 'HX-Target': 'htmxDialog' },
      }),
    );
    const csrf = this.extractCsrf(String(confirmRes.data ?? ''));
    if (!csrf) {
      throw new NotImplementedException(
        `No se pudo obtener csrf del modal de confirmación delete (detalleId=${detalleId}).`,
      );
    }

    this.logger.warn(
      `[EBF-PORTAL] DELETE detalleId=${detalleId} — irreversible`,
    );

    const res = await this.withSessionRetry(() =>
      this.http.postForm(
        path,
        { csrfmiddlewaretoken: csrf },
        {
          detectAuthRedirect: true,
          htmx: true,
          referer: this.coordinarReferer(),
          headers: { 'HX-Target': 'htmxDialog' },
        },
      ),
    );

    if (res.status === 302) {
      return {
        ok: true,
        status: 302,
        redirectTo: String(res.headers['location'] ?? '') || null,
      };
    }
    const errors = extractUpdateErrors(String(res.data ?? ''));
    return {
      ok: errors.length === 0 && res.status >= 200 && res.status < 300,
      status: res.status,
      errors,
    };
  }

  // === helpers ===

  private findProducto(spec: UpdateFormSpec, id: number): ProductoOption {
    const found = spec.productos.find((p) => p.value === String(id));
    if (!found) {
      throw new BadRequestException(
        `Producto ${id} no es válido para esta coordinación (detalleId=${spec.detalleId}).`,
      );
    }
    if (found.errorMessage) {
      throw new UnprocessableEntityException(
        `Producto ${found.label} no coordinable: ${found.errorMessage}`,
      );
    }
    return found;
  }

  private validateAgainstProducto(
    dto: UpdateCoordinacionDto,
    producto: ProductoOption,
  ): void {
    if (!producto.isFullBxs && (dto.fbCoo ?? 0) > 0) {
      throw new BadRequestException(
        `fbCoo solo se acepta para productos full-bxs (${producto.label} no lo es).`,
      );
    }
    if (producto.isCompoundProduct) {
      if (!dto.compoundProductos || dto.compoundProductos.length < 2) {
        throw new BadRequestException(
          `Producto ${producto.label} es compuesto: requiere compoundProductos con ≥2 ids.`,
        );
      }
      const dupes = dto.compoundProductos.filter(
        (id, i, arr) => arr.indexOf(id) !== i,
      );
      if (dupes.length) {
        throw new BadRequestException(
          `compoundProductos no debe tener duplicados (repetidos: ${[...new Set(dupes)].join(', ')}).`,
        );
      }
    }
  }

  private buildUpdateBody(
    detalleId: number,
    productoId: number,
    dto: UpdateCoordinacionDto,
    spec: UpdateFormSpec,
    computed: { fbCoo: number; bxsCoo: number; pcsCoo: number },
  ): Record<string, string> {
    const body: Record<string, string> = {
      csrfmiddlewaretoken: spec.csrfToken,
      producto: String(productoId),
      fb_coo: String(computed.fbCoo),
      hb_coo: String(dto.hbCoo),
      qb_coo: String(dto.qbCoo),
      eb_coo: String(dto.ebCoo),
      bxs_coo: String(computed.bxsCoo),
      pcs_coo: String(computed.pcsCoo),
    };

    const compound = dto.compoundProductos ?? [];
    const total = Math.max(compound.length, spec.compoundFormset.minNumForms);
    const prefix = spec.compoundFormset.prefix;
    body[`${prefix}-TOTAL_FORMS`] = String(total);
    body[`${prefix}-INITIAL_FORMS`] = String(spec.compoundFormset.initialForms);
    body[`${prefix}-MIN_NUM_FORMS`] = String(spec.compoundFormset.minNumForms);
    body[`${prefix}-MAX_NUM_FORMS`] = String(spec.compoundFormset.maxNumForms);
    for (let i = 0; i < total; i++) {
      const id = compound[i] != null ? String(compound[i]) : '';
      body[`${prefix}-${i}-id`] = '';
      body[`${prefix}-${i}-detalle_coordinacion`] = String(detalleId);
      body[`${prefix}-${i}-producto`] = id;
    }
    return body;
  }

  private extractCsrf(html: string): string | null {
    const m = /name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']+)["']/i.exec(
      html,
    );
    return m ? m[1] : null;
  }

  private updatePath(detalleId: number): string {
    return `${this.cfg.paths.coordinacionUpdatePrefix}${detalleId}/update/`;
  }

  private deletePath(detalleId: number): string {
    return `${this.cfg.paths.detalleDeletePrefix}${detalleId}/delete/`;
  }

  private coordinarReferer(): string {
    return `${this.http.baseUrl}${this.cfg.paths.coordinarPage}`;
  }

  private assertCoordinacionWindow(): void {
    const inside = isWithinWindow(COORDINACION_WINDOWS, this.cfg.timezone);
    if (!inside) {
      this.logger.warn(
        `[EBF-PORTAL] write attempt outside coordinación window (${describeWindows(COORDINACION_WINDOWS)} ${this.cfg.timezone})`,
      );
      throw new NotImplementedException(
        `Portal EBF fuera de ventana. Ventanas: ${describeWindows(COORDINACION_WINDOWS)} (${this.cfg.timezone}).`,
      );
    }
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
