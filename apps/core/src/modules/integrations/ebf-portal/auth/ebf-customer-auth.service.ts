import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbfCustomerHttpClient } from '../http/ebf-customer-http.client';
import { extractCsrfFormToken } from '../parsers/csrf.parser';
import type { EbfPortalConfig } from '../config/ebf-portal.config';

/**
 * Auth para el rol cliente. Mirror del [EbfAuthService](./ebf-auth.service.ts)
 * pero apunta a `cfg.customerUsername` / `cfg.customerPassword` y usa el
 * cookie jar del [EbfCustomerHttpClient](../http/ebf-customer-http.client.ts).
 */
@Injectable()
export class EbfCustomerAuthService {
  private readonly logger = new Logger(EbfCustomerAuthService.name);
  private readonly cfg: EbfPortalConfig;
  private loginInFlight: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: EbfCustomerHttpClient,
  ) {
    this.cfg = this.configService.getOrThrow<EbfPortalConfig>('ebfPortal');
  }

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

  async forceRelogin(): Promise<void> {
    this.http.resetSession();
    await this.ensureSession();
  }

  private async performLogin(): Promise<void> {
    if (!this.cfg.customerUsername || !this.cfg.customerPassword) {
      throw new UnauthorizedException(
        'EBF_PORTAL_CUSTOMER_USER / EBF_PORTAL_CUSTOMER_PASS no configurados.',
      );
    }

    const loginUrl = `${this.cfg.loginPath}?next=/`;
    const pageRes = await this.http.get(loginUrl);
    const formToken = extractCsrfFormToken(String(pageRes.data ?? ''));
    if (!formToken) {
      throw new UnauthorizedException(
        'No se pudo extraer csrfmiddlewaretoken del login HTML (cliente).',
      );
    }
    if (!this.http.csrfToken()) {
      throw new UnauthorizedException(
        'Cookie __Secure-csrftoken no fue emitida por el portal (cliente).',
      );
    }

    const res = await this.http.postForm(this.cfg.loginPath, {
      csrfmiddlewaretoken: formToken,
      login: this.cfg.customerUsername,
      password: this.cfg.customerPassword,
      next: '/',
      remember: 'on',
    });

    if (res.status !== 302 || !this.http.hasSession()) {
      throw new UnauthorizedException(
        `Login a EBF Portal (cliente) falló (status=${res.status}, hasSession=${this.http.hasSession()}).`,
      );
    }
    this.logger.log(
      `[EBF-PORTAL/customer] login OK as ${this.cfg.customerUsername}`,
    );
  }
}
