import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Agent as HttpsAgent } from 'https';
import { CookieJar } from './cookie-jar';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

export interface EbfRequestOptions {
  /** Si true, lanza error en 302→login para que el caller dispare relogin. */
  detectAuthRedirect?: boolean;
  /** Marca la request como HTMX (añade HX-Request: true). */
  htmx?: boolean;
  /** Override del Referer. Útil para endpoints helper que el portal espera servidos desde la página coordinar. */
  referer?: string;
  /** Headers extras (merge sobre los defaults). */
  headers?: Record<string, string>;
}

const CSRF_COOKIE = '__Secure-csrftoken';

@Injectable()
export class EbfHttpClient {
  private readonly logger = new Logger(EbfHttpClient.name);
  private readonly axios: AxiosInstance;
  private readonly cfg: EbfPortalConfig;
  readonly jar = new CookieJar();

  constructor(private readonly configService: ConfigService) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
    // Agent con keep-alive: reusa el socket TLS entre requests al portal.
    // Sin esto, cada call paga ~200-500ms de handshake (Ecuador↔EBF).
    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      keepAliveMsecs: 30_000,
      maxSockets: 10,
      maxFreeSockets: 5,
    });
    this.axios = axios.create({
      baseURL: this.cfg.baseUrl,
      timeout: this.cfg.requestTimeoutMs,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      httpsAgent,
      // axios v1 ya hace decompress por default cuando responseType != stream,
      // pero hay que pedirlo explícito porque por default no manda el header.
      decompress: true,
      headers: {
        'User-Agent': 'experts-core/ebf-portal-integration',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
      },
    });
  }

  get baseUrl(): string {
    return this.cfg.baseUrl;
  }

  csrfToken(): string | undefined {
    return this.jar.get(CSRF_COOKIE);
  }

  hasSession(): boolean {
    return Boolean(this.jar.get('__Secure-sessionid'));
  }

  resetSession(): void {
    this.jar.clear();
  }

  async get(path: string, opts: EbfRequestOptions = {}): Promise<AxiosResponse> {
    const res = await this.axios.get(path, {
      headers: this.buildHeaders(path, opts),
    });
    this.jar.ingestSetCookie(res.headers['set-cookie']);
    this.maybeDetectAuthRedirect(res, opts);
    return res;
  }

  /**
   * POST form-urlencoded con CSRF auto. Si la página objetivo requiere
   * `csrfmiddlewaretoken` debe venir en `body`; este método solo añade el
   * header `X-CSRFToken` desde la cookie.
   */
  async postForm(
    path: string,
    body: Record<string, string>,
    opts: EbfRequestOptions = {},
  ): Promise<AxiosResponse> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) params.append(k, v);

    const res = await this.axios.post(path, params.toString(), {
      headers: {
        ...this.buildHeaders(path, opts),
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(this.csrfToken() ? { 'X-CSRFToken': this.csrfToken()! } : {}),
        Origin: this.cfg.baseUrl,
      },
    });
    this.jar.ingestSetCookie(res.headers['set-cookie']);
    this.maybeDetectAuthRedirect(res, opts);
    return res;
  }

  /** POST application/json con CSRF auto. Usado por box_weight_factor_calculator. */
  async postJson<T = unknown>(
    path: string,
    body: unknown,
    opts: EbfRequestOptions = {},
  ): Promise<AxiosResponse<T>> {
    const res = await this.axios.post<T>(path, body, {
      headers: {
        ...this.buildHeaders(path, opts),
        'Content-Type': 'application/json',
        ...(this.csrfToken() ? { 'X-CSRFToken': this.csrfToken()! } : {}),
        Origin: this.cfg.baseUrl,
      },
    });
    this.jar.ingestSetCookie(res.headers['set-cookie']);
    this.maybeDetectAuthRedirect(res, opts);
    return res;
  }

  private buildHeaders(
    path: string,
    opts: EbfRequestOptions = {},
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: opts.referer ?? `${this.cfg.baseUrl}${path}`,
    };
    if (opts.htmx) {
      headers['HX-Request'] = 'true';
      headers['HX-Current-URL'] = opts.referer ?? `${this.cfg.baseUrl}${path}`;
    }
    const cookie = this.jar.toHeader();
    if (cookie) headers.Cookie = cookie;
    if (opts.headers) Object.assign(headers, opts.headers);
    return headers;
  }

  private maybeDetectAuthRedirect(
    res: AxiosResponse,
    opts: EbfRequestOptions,
  ): void {
    if (!opts.detectAuthRedirect) return;
    if (res.status === 302) {
      const loc = String(res.headers['location'] ?? '');
      if (loc.startsWith('/accounts/login')) {
        const err = new Error('EBF_SESSION_EXPIRED');
        (err as Error & { code: string }).code = 'EBF_SESSION_EXPIRED';
        throw err;
      }
    }
  }
}
