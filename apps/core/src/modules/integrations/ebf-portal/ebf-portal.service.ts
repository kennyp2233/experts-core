import { Injectable } from '@nestjs/common';
import { EbfCoordinacionService } from './services/coordinacion.service';
import { EbfCoordinacionSelectionService } from './services/coordinacion-selection.service';
import { EbfCoordinacionCreateService } from './services/coordinacion-create.service';
import { EbfCoordinacionUpdateService } from './services/coordinacion-update.service';
import { EbfDaeService } from './services/dae.service';
import { EbfCustomerAwbService } from './services/customer-awb.service';
import { EbfAuthService } from './auth/ebf-auth.service';
import { EbfCustomerAuthService } from './auth/ebf-customer-auth.service';

/**
 * Facade del módulo. Mantener delgada: solo orquesta auth + delega en
 * services específicos. La lógica de scraping/POST vive en los services.
 */
@Injectable()
export class EbfPortalService {
  constructor(
    readonly coordinacion: EbfCoordinacionService,
    readonly selection: EbfCoordinacionSelectionService,
    readonly create: EbfCoordinacionCreateService,
    readonly update: EbfCoordinacionUpdateService,
    readonly dae: EbfDaeService,
    readonly customer: EbfCustomerAwbService,
    private readonly auth: EbfAuthService,
    private readonly customerAuth: EbfCustomerAuthService,
  ) {}

  /** Health-check de la sesión manager. */
  async ensureSession(): Promise<{ ok: true }> {
    await this.auth.ensureSession();
    return { ok: true };
  }

  /** Health-check de la sesión cliente. */
  async ensureCustomerSession(): Promise<{ ok: true }> {
    await this.customerAuth.ensureSession();
    return { ok: true };
  }
}
