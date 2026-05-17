import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfHttpClient } from '../http/ebf-http.client';
import { extractCsrfFormToken } from '../parsers/csrf.parser';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

@Injectable()
export class EbfAuthService {
  private readonly logger = new Logger(EbfAuthService.name);
  private readonly cfg: EbfPortalConfig;
  private loginInFlight: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfHttpClient,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

  /**
   * Asegura sesión válida. Reusa la cookie existente si la hay; sino loguea.
   * Concurrent-safe: requests paralelos comparten una sola Promise de login.
   */
  async ensureSession(): Promise<void> {
    if (this.http.hasSession()) return;
    if (this.loginInFlight) {
      await this.loginInFlight;
      return;
    }
    this.loginInFlight = this.performLogin().finally(() => {
      this.loginInFlight = null;
    });
    await this.loginInFlight;
  }

  /** Fuerza relogin (uso típico tras detectar 302 → /accounts/login/). */
  async forceRelogin(): Promise<void> {
    this.http.resetSession();
    await this.ensureSession();
  }

  private async performLogin(): Promise<void> {
    if (!this.cfg.username || !this.cfg.password) {
      throw new UnauthorizedException(
        'EBF_PORTAL_USER / EBF_PORTAL_PASS no configurados.',
      );
    }

    const loginUrl = `${this.cfg.loginPath}?next=/`;
    const pageRes = await this.http.get(loginUrl);
    const formToken = extractCsrfFormToken(String(pageRes.data ?? ''));
    if (!formToken) {
      throw new UnauthorizedException(
        'No se pudo extraer csrfmiddlewaretoken del login HTML.',
      );
    }
    if (!this.http.csrfToken()) {
      throw new UnauthorizedException(
        'Cookie __Secure-csrftoken no fue emitida por el portal.',
      );
    }

    const res = await this.http.postForm(this.cfg.loginPath, {
      csrfmiddlewaretoken: formToken,
      login: this.cfg.username,
      password: this.cfg.password,
      next: '/',
      remember: 'on',
    });

    if (res.status !== 302 || !this.http.hasSession()) {
      throw new UnauthorizedException(
        `Login a EBF Portal falló (status=${res.status}, hasSession=${this.http.hasSession()}).`,
      );
    }
    this.logger.log(`[EBF-PORTAL] login OK as ${this.cfg.username}`);
  }
}
