import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CookieJar } from './cookie-jar';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

export interface EbfRequestOptions {
  /** Si true, lanza error en 302→login para que el caller dispare relogin. */
  detectAuthRedirect?: boolean;
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
    this.axios = axios.create({
      baseURL: this.cfg.baseUrl,
      timeout: this.cfg.requestTimeoutMs,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'experts-core/ebf-portal-integration',
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
      headers: this.buildHeaders(path),
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
        ...this.buildHeaders(path),
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(this.csrfToken() ? { 'X-CSRFToken': this.csrfToken()! } : {}),
        Origin: this.cfg.baseUrl,
      },
    });
    this.jar.ingestSetCookie(res.headers['set-cookie']);
    this.maybeDetectAuthRedirect(res, opts);
    return res;
  }

  private buildHeaders(path: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: `${this.cfg.baseUrl}${path}`,
    };
    const cookie = this.jar.toHeader();
    if (cookie) headers.Cookie = cookie;
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
