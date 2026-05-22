import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfCustomerHttpClient } from '../http/ebf-customer-http.client';
import { EbfCustomerAuthService } from '../auth/ebf-customer-auth.service';
import { parseCustomerAwbList } from '../parsers/customer-awb-list.parser';
import { parseCustomerAwbHeader } from '../parsers/customer-awb-header.parser';
import { parseCustomerAwbDetails } from '../parsers/customer-awb-details.parser';
import { parseCustomerAwbCustomers } from '../parsers/customer-awb-customers.parser';
import { parseCustomerAwbDocuments } from '../parsers/customer-awb-documents.parser';
import { parseCustomerProfile } from '../parsers/customer-profile.parser';
import type {
  CustomerAwbCustomersView,
  CustomerAwbDetailsView,
  CustomerAwbDocumentsView,
  CustomerAwbHeader,
  CustomerAwbListPage,
  CustomerAwbListQuery,
  CustomerProfile,
} from '../types/customer-awb.types';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

/** Resultado de una descarga binaria proxyed. */
export interface BinaryDownload {
  body: Buffer;
  contentType: string;
  /** Sin path — sólo el filename. Null si el portal no provee Content-Disposition. */
  fileName: string | null;
}

/**
 * Vistas del rol cliente: lista AWBs, detalle + tabs (INFO/CUSTOMERS/
 * DOCUMENTS), export XLSX, descarga de archivos. Todo es read-only — no
 * hay writes en este namespace.
 *
 * El path base es `/customer/*`. Para construir las URLs de descarga del
 * front, el service recibe `buildDownloadUrl()` desde el controller — así
 * no hardcodeamos el prefijo de nuestra API en el parser.
 */
@Injectable()
export class EbfCustomerAwbService {
  private readonly logger = new Logger(EbfCustomerAwbService.name);
  private readonly cfg: EbfPortalConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfCustomerHttpClient,
    private readonly auth: EbfCustomerAuthService,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

  async list(query: CustomerAwbListQuery): Promise<CustomerAwbListPage> {
    if (!query.etdStart || !query.etdEnd) {
      throw new BadRequestException(
        'etdStart y etdEnd son obligatorios (YYYY-MM-DD).',
      );
    }
    await this.auth.ensureSession();
    const qs = this.buildQuery({
      etd_start: query.etdStart,
      etd_end: query.etdEnd,
      aerolinea: query.aerolinea,
      consignatarios:
        query.consignatarios != null ? String(query.consignatarios) : undefined,
      awb: query.awb,
      page: query.page != null ? String(query.page) : undefined,
      sort: query.sort,
    });
    const path = `${this.cfg.paths.customerAwbList}?${qs}`;
    const res = await this.withSessionRetry(() =>
      this.http.get(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.customerAwbList}`,
      }),
    );
    const parsed = parseCustomerAwbList(String(res.data ?? ''), query.page ?? 1);
    return {
      ...parsed,
      sort: query.sort,
      retrievedAt: new Date().toISOString(),
    };
  }

  async getHeader(id: number): Promise<CustomerAwbHeader> {
    await this.auth.ensureSession();
    const path = `${this.cfg.paths.customerAwbPrefix}${id}/info/`;
    const res = await this.withSessionRetry(() =>
      this.http.get(path, { detectAuthRedirect: true }),
    );
    return parseCustomerAwbHeader(id, String(res.data ?? ''));
  }

  async getDetails(
    id: number,
    filters: {
      consignatarioMarcacion?: number;
      truck?: number;
      shipper?: number;
      onlyDailyCoo?: boolean;
    },
    exportXlsxUrl: string,
  ): Promise<CustomerAwbDetailsView> {
    await this.auth.ensureSession();
    const qs = this.buildQuery({
      consignatario_marcacion:
        filters.consignatarioMarcacion != null
          ? String(filters.consignatarioMarcacion)
          : undefined,
      truck: filters.truck != null ? String(filters.truck) : undefined,
      shipper: filters.shipper != null ? String(filters.shipper) : undefined,
      only_daily_coo:
        filters.onlyDailyCoo != null ? (filters.onlyDailyCoo ? 'True' : 'False') : undefined,
    });
    const path =
      `${this.cfg.paths.customerAwbPrefix}${id}/details/` + (qs ? `?${qs}` : '');
    const res = await this.withSessionRetry(() =>
      this.http.get(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.customerAwbPrefix}${id}/info/`,
      }),
    );
    return parseCustomerAwbDetails(id, String(res.data ?? ''), exportXlsxUrl);
  }

  async getCustomers(
    id: number,
    sort?: string,
  ): Promise<CustomerAwbCustomersView> {
    await this.auth.ensureSession();
    const qs = sort ? `?sort=${encodeURIComponent(sort)}` : '';
    const path = `${this.cfg.paths.customerAwbPrefix}${id}/customers/${qs}`;
    const res = await this.withSessionRetry(() =>
      this.http.get(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.customerAwbPrefix}${id}/info/`,
      }),
    );
    return parseCustomerAwbCustomers(String(res.data ?? ''));
  }

  async getDocuments(
    id: number,
    downloadUrlBuilder: (portalUrl: string) => string,
    downloadAllUrlBuilder: () => string,
  ): Promise<CustomerAwbDocumentsView> {
    await this.auth.ensureSession();
    const path = `${this.cfg.paths.customerAwbPrefix}${id}/documents/`;
    const res = await this.withSessionRetry(() =>
      this.http.get(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.customerAwbPrefix}${id}/info/`,
      }),
    );
    const documents = parseCustomerAwbDocuments(
      String(res.data ?? ''),
      downloadUrlBuilder,
    );
    return {
      awbId: id,
      documents,
      downloadAllUrl: downloadAllUrlBuilder(),
      hasDocuments: documents.length > 0,
    };
  }

  /**
   * Proxy del XLSX. Mantiene los mismos filtros que el tab INFO. Devuelve
   * Buffer + filename del Content-Disposition del portal.
   */
  async exportDetailsXlsx(
    id: number,
    filters: {
      consignatarioMarcacion?: number;
      truck?: number;
      shipper?: number;
      onlyDailyCoo?: boolean;
    },
  ): Promise<BinaryDownload> {
    await this.auth.ensureSession();
    const qs = this.buildQuery({
      _export: 'xlsx',
      consignatario_marcacion:
        filters.consignatarioMarcacion != null
          ? String(filters.consignatarioMarcacion)
          : undefined,
      truck: filters.truck != null ? String(filters.truck) : undefined,
      shipper: filters.shipper != null ? String(filters.shipper) : undefined,
      only_daily_coo:
        filters.onlyDailyCoo != null ? (filters.onlyDailyCoo ? 'True' : 'False') : undefined,
    });
    const path = `${this.cfg.paths.customerAwbPrefix}${id}/details/?${qs}`;
    const res = await this.withSessionRetry(() =>
      this.http.getBinary(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.customerAwbPrefix}${id}/info/`,
      }),
    );
    return this.toDownload(res, `awb-${id}.xlsx`);
  }

  /** Bulk download (zip) de todos los docs de un AWB. */
  async downloadAllDocuments(id: number): Promise<BinaryDownload> {
    await this.auth.ensureSession();
    const path = `${this.cfg.paths.customerAwbPrefix}${id}/documents/download-all/`;
    const res = await this.withSessionRetry(() =>
      this.http.getBinary(path, {
        detectAuthRedirect: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.customerAwbPrefix}${id}/info/`,
      }),
    );
    return this.toDownload(res, `awb-${id}-documents.zip`);
  }

  /**
   * Proxy de un archivo individual. `filename` se concatena al prefijo
   * `/media/docs_coordinacion/` — validamos que sea un nombre simple para
   * impedir traversal (`..`, `/`).
   */
  async downloadDocument(filename: string): Promise<BinaryDownload> {
    if (!filename || /[\\/]|\.\./.test(filename)) {
      throw new BadRequestException(
        'filename inválido — no debe contener separadores ni `..`',
      );
    }
    await this.auth.ensureSession();
    const path = `${this.cfg.paths.customerMediaPrefix}${encodeURIComponent(filename)}`;
    const res = await this.withSessionRetry(() =>
      this.http.getBinary(path, { detectAuthRedirect: true }),
    );
    return this.toDownload(res, filename);
  }

  /** Profile cliente (modal HTML parseado a JSON). */
  async getProfile(clienteId: number): Promise<CustomerProfile> {
    await this.auth.ensureSession();
    const path = `${this.cfg.paths.customerProfilePrefix}${clienteId}/`;
    const res = await this.withSessionRetry(() =>
      this.http.get(path, {
        detectAuthRedirect: true,
        htmx: true,
        referer: `${this.http.baseUrl}${this.cfg.paths.customerAwbList}`,
      }),
    );
    return parseCustomerProfile(clienteId, String(res.data ?? ''));
  }

  private toDownload(
    res: { data: Buffer; headers: Record<string, unknown> },
    fallbackName: string,
  ): BinaryDownload {
    const ct = String(res.headers['content-type'] ?? 'application/octet-stream');
    const cd = String(res.headers['content-disposition'] ?? '');
    const nameMatch = /filename="?([^";]+)"?/i.exec(cd);
    return {
      body: Buffer.isBuffer(res.data) ? res.data : Buffer.from(res.data),
      contentType: ct,
      fileName: nameMatch ? nameMatch[1] : fallbackName,
    };
  }

  private buildQuery(params: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      sp.append(k, v);
    }
    return sp.toString();
  }

  private async withSessionRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'EBF_SESSION_EXPIRED') {
        this.logger.warn('[EBF-PORTAL/customer] session expired — reloging');
        await this.auth.forceRelogin();
        return await fn();
      }
      throw err;
    }
  }
}
