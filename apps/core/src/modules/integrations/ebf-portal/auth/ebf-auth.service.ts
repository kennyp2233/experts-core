import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
    // Server config issue — el cliente EXPERTS no está mal, falta env en prod.
    // 503 ServiceUnavailable es la semántica correcta (NO 401, sino el front
    // dispara su flujo de logout pensando que la sesión EXPERTS expiró).
    if (!this.cfg.username || !this.cfg.password) {
      throw new ServiceUnavailableException(
        'EBF Portal: EBF_PORTAL_USER / EBF_PORTAL_PASS no configurados en el server.',
      );
    }

    const loginUrl = `${this.cfg.loginPath}?next=/`;
    const pageRes = await this.http.get(loginUrl);
    const formToken = extractCsrfFormToken(String(pageRes.data ?? ''));
    // Las siguientes fallas son del upstream EBF (portal mal-respondiendo,
    // creds rechazadas, etc.) — 502 BadGateway es lo apropiado.
    if (!formToken) {
      throw new BadGatewayException(
        'EBF Portal: no se pudo extraer csrfmiddlewaretoken del login HTML.',
      );
    }
    if (!this.http.csrfToken()) {
      throw new BadGatewayException(
        'EBF Portal: cookie __Secure-csrftoken no emitida.',
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
      throw new BadGatewayException(
        `EBF Portal: login falló (status=${res.status}, hasSession=${this.http.hasSession()}). Revisar creds o status del portal.`,
      );
    }
    this.logger.log(`[EBF-PORTAL] login OK as ${this.cfg.username}`);
  }
}
