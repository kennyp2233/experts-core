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
  extractCreateErrors,
  parseCreateModal,
} from '../parsers/coordinacion-create-modal.parser';
import {
  COORDINACION_WINDOWS,
  describeWindows,
  isWithinWindow,
} from '../utils/horarios.util';
import type {
  BoxWeightInput,
  BoxWeightResult,
  CreateCoordinacionResult,
  CreateFormSpec,
  ProductoOption,
} from '../types/coordinacion-create.types';
import type { CreateCoordinacionDto } from '../dto/create-coordinacion.dto';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

@Injectable()
export class EbfCoordinacionCreateService {
  private readonly logger = new Logger(EbfCoordinacionCreateService.name);
  private readonly cfg: EbfPortalConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfHttpClient,
    private readonly auth: EbfAuthService,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

  /**
   * GET `/exportador/detalle/create/` con el cascade ya resuelto. Devuelve
   * la spec parseada del modal "Crear Detalle De Coordinación" (csrf,
   * hidden, productos con flags, formset compuesto, valores iniciales).
   *
   * Read-only — no requiere ventana operativa.
   */
  async getCreateForm(args: {
    exportadorId: number;
    marcacionId: number;
    vueloId: number;
    daeId: number;
  }): Promise<CreateFormSpec> {
    await this.auth.ensureSession();
    const url =
      this.cfg.paths.detalleCreate +
      '?' +
      new URLSearchParams({
        exportador: String(args.exportadorId),
        consignatario_marcacion: String(args.marcacionId),
        vuelo: String(args.vueloId),
        dae: String(args.daeId),
      }).toString();
    const res = await this.withSessionRetry(() =>
      this.http.get(url, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.coordinarPage}`,
        headers: { 'HX-Target': 'htmxDialog' },
      }),
    );
    return parseCreateModal(String(res.data ?? ''));
  }

  /**
   * POST JSON a `/exportador/box_weight_factor_calculator/`. El portal usa
   * esto para calcular bxs_coo/pcs_coo a partir de fb/hb/qb/eb. Read-only
   * en términos de side-effects, pero conviene NO llamarlo fuera del flujo
   * de creación (es interno del modal).
   */
  async calculateBoxWeight(input: BoxWeightInput): Promise<BoxWeightResult> {
    await this.auth.ensureSession();
    const res = await this.withSessionRetry(() =>
      this.http.postJson<BoxWeightResult>(
        this.cfg.paths.boxWeightCalculator,
        input,
        {
          detectAuthRedirect: true,
          htmx: true,
          referer: `${this.http.baseUrl}${this.cfg.paths.coordinarPage}`,
        },
      ),
    );
    return res.data;
  }

  /**
   * Crea una coordinación en el portal. Flujo:
   *   1. Valida ventana operativa.
   *   2. GET modal para sacar csrf fresco + validar producto.
   *   3. Calcula bxs/pcs vía el portal.
   *   4. POST `/exportador/detalle/create/` con el form completo.
   *   5. Parsea resultado (302 → éxito; 200 → re-render con errores).
   *
   * No queueado todavía — si el portal sufre con concurrencia, encolar
   * con Bull (ver módulo `templates/fito` como referencia).
   */
  async createCoordinacion(
    dto: CreateCoordinacionDto,
  ): Promise<CreateCoordinacionResult> {
    this.assertCoordinacionWindow();

    const spec = await this.getCreateForm({
      exportadorId: dto.exportadorId,
      marcacionId: dto.consignatarioMarcacionId,
      vueloId: dto.docCoordinacionId,
      daeId: dto.daeId,
    });

    const producto = this.findProducto(spec, dto.productoId);
    this.validateAgainstProducto(dto, producto);

    const fbCoo = producto.isFullBxs ? (dto.fbCoo ?? 0) : 0;
    const { bxs_coo, pcs_coo } = await this.calculateBoxWeight({
      fb_coo: fbCoo,
      hb_coo: dto.hbCoo,
      qb_coo: dto.qbCoo,
      eb_coo: dto.ebCoo,
    });

    const body = this.buildSubmitBody(dto, spec, {
      fbCoo,
      bxsCoo: bxs_coo,
      pcsCoo: pcs_coo,
    });

    this.logger.log(
      `[EBF-PORTAL] submit coordinación exp=${dto.exportadorId} marc=${dto.consignatarioMarcacionId} vuelo=${dto.docCoordinacionId} dae=${dto.daeId} prod=${dto.productoId}`,
    );

    const res = await this.withSessionRetry(() =>
      this.http.postForm(this.cfg.paths.detalleCreate, body, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.coordinarPage}`,
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
    const errors = extractCreateErrors(html);
    return {
      ok: errors.length === 0 && res.status >= 200 && res.status < 300,
      status: res.status,
      errors,
      rawHtml: html,
    };
  }

  private findProducto(spec: CreateFormSpec, id: number): ProductoOption {
    const found = spec.productos.find((p) => p.value === String(id));
    if (!found) {
      throw new BadRequestException(
        `Producto ${id} no está disponible para este vuelo/DAE. Opciones: ${spec.productos
          .map((p) => `${p.value}=${p.label}`)
          .join(', ')}`,
      );
    }
    if (found.errorMessage) {
      throw new UnprocessableEntityException(
        `Producto ${found.label} no es coordinable: ${found.errorMessage}`,
      );
    }
    return found;
  }

  private validateAgainstProducto(
    dto: CreateCoordinacionDto,
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

  private buildSubmitBody(
    dto: CreateCoordinacionDto,
    spec: CreateFormSpec,
    computed: { fbCoo: number; bxsCoo: number; pcsCoo: number },
  ): Record<string, string> {
    const body: Record<string, string> = {
      csrfmiddlewaretoken: spec.csrfToken,
      // Selección (replica del #multiple-detalle-form que el navegador adjunta vía hx-include)
      exportador: String(dto.exportadorId),
      consignatario_marcacion: String(dto.consignatarioMarcacionId),
      vuelo: String(dto.docCoordinacionId),
      dae: String(dto.daeId),
      // Hidden del modal (mismos ids con otro alias)
      doc_coordinacion: String(dto.docCoordinacionId),
      // Form principal
      producto: String(dto.productoId),
      fb_coo: String(computed.fbCoo),
      hb_coo: String(dto.hbCoo),
      qb_coo: String(dto.qbCoo),
      eb_coo: String(dto.ebCoo),
      bxs_coo: String(computed.bxsCoo),
      pcs_coo: String(computed.pcsCoo),
    };

    const compound = dto.compoundProductos ?? [];
    const total = Math.max(compound.length, spec.compoundFormset.minNumForms);
    body[`${spec.compoundFormset.prefix}-TOTAL_FORMS`] = String(total);
    body[`${spec.compoundFormset.prefix}-INITIAL_FORMS`] = String(
      spec.compoundFormset.initialForms,
    );
    body[`${spec.compoundFormset.prefix}-MIN_NUM_FORMS`] = String(
      spec.compoundFormset.minNumForms,
    );
    body[`${spec.compoundFormset.prefix}-MAX_NUM_FORMS`] = String(
      spec.compoundFormset.maxNumForms,
    );
    for (let i = 0; i < total; i++) {
      const productoId = compound[i] != null ? String(compound[i]) : '';
      body[`${spec.compoundFormset.prefix}-${i}-id`] = '';
      body[`${spec.compoundFormset.prefix}-${i}-detalle_coordinacion`] = '';
      body[`${spec.compoundFormset.prefix}-${i}-producto`] = productoId;
    }
    return body;
  }

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
