import { Injectable } from '@nestjs/common';
import { EbfCoordinacionService } from './services/coordinacion.service';
import { EbfCoordinacionSelectionService } from './services/coordinacion-selection.service';
import { EbfCoordinacionCreateService } from './services/coordinacion-create.service';
import { EbfDaeService } from './services/dae.service';
import { EbfAuthService } from './auth/ebf-auth.service';

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
    readonly dae: EbfDaeService,
    private readonly auth: EbfAuthService,
  ) {}

  /** Útil para health-check del módulo. */
  async ensureSession(): Promise<{ ok: true }> {
    await this.auth.ensureSession();
    return { ok: true };
  }
}
