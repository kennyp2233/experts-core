import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';

/**
 * Servicio para gestionar feature flags
 * Permite habilitar/deshabilitar funcionalidades por entidad
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  // Cache en memoria
  private flagCache = new Map<string, { enabled: boolean; timestamp: number }>();
  private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verificar si un feature está habilitado para una entidad específica
   *
   * Lógica de decisión:
   * 1. Si está en disabledFor[Entity] → retorna false
   * 2. Si está en enabledFor[Entity] → retorna true
   * 3. Sino, retorna el enabled global
   */
  async isEnabled(
    featureName: string,
    depotId?: string,
    workerId?: string,
  ): Promise<boolean> {
    const cacheKey = `${featureName}_${depotId || 'null'}_${workerId || 'null'}`;

    // Check cache
    const cached = this.flagCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Feature flag cache hit for: ${cacheKey} = ${cached.enabled}`);
      return cached.enabled;
    }

    // Load flag from DB
    const flag = await this.prisma.featureFlag.findUnique({
      where: { name: featureName },
    });

    if (!flag) {
      this.logger.warn(`Feature flag not found: ${featureName}, defaulting to false`);
      return false;
    }

    // Check específico primero
    let enabled = flag.enabled;

    // Evaluar worker-specific
    if (workerId) {
      const disabledWorkers = this.parseJsonArray(flag.disabledForWorkers);
      if (disabledWorkers.includes(workerId)) {
        enabled = false;
        this.cacheResult(cacheKey, enabled);
        return enabled;
      }

      const enabledWorkers = this.parseJsonArray(flag.enabledForWorkers);
      if (enabledWorkers.includes(workerId)) {
        enabled = true;
        this.cacheResult(cacheKey, enabled);
        return enabled;
      }
    }

    // Evaluar depot-specific
    if (depotId) {
      const disabledDepots = this.parseJsonArray(flag.disabledForDepots);
      if (disabledDepots.includes(depotId)) {
        enabled = false;
        this.cacheResult(cacheKey, enabled);
        return enabled;
      }

      const enabledDepots = this.parseJsonArray(flag.enabledForDepots);
      if (enabledDepots.includes(depotId)) {
        enabled = true;
        this.cacheResult(cacheKey, enabled);
        return enabled;
      }
    }

    // Default: usar enabled global
    this.cacheResult(cacheKey, enabled);
    return enabled;
  }

  /**
   * Habilitar feature globalmente
   */
  async enableFeature(featureName: string): Promise<void> {
    await this.upsertFlag(featureName, { enabled: true });
    this.clearCache();
  }

  /**
   * Deshabilitar feature globalmente
   */
  async disableFeature(featureName: string): Promise<void> {
    await this.upsertFlag(featureName, { enabled: false });
    this.clearCache();
  }

  /**
   * Habilitar feature para depot específico
   */
  async enableForDepot(featureName: string, depotId: string): Promise<void> {
    const flag = await this.getOrCreateFlag(featureName);

    const enabledDepots = this.parseJsonArray(flag.enabledForDepots);
    const disabledDepots = this.parseJsonArray(flag.disabledForDepots);

    // Agregar a enabled, remover de disabled
    if (!enabledDepots.includes(depotId)) {
      enabledDepots.push(depotId);
    }
    const newDisabledDepots = disabledDepots.filter((id) => id !== depotId);

    await this.prisma.featureFlag.update({
      where: { name: featureName },
      data: {
        enabledForDepots: JSON.stringify(enabledDepots),
        disabledForDepots: JSON.stringify(newDisabledDepots),
      },
    });

    this.clearCache();
  }

  /**
   * Deshabilitar feature para depot específico
   */
  async disableForDepot(featureName: string, depotId: string): Promise<void> {
    const flag = await this.getOrCreateFlag(featureName);

    const enabledDepots = this.parseJsonArray(flag.enabledForDepots);
    const disabledDepots = this.parseJsonArray(flag.disabledForDepots);

    // Agregar a disabled, remover de enabled
    if (!disabledDepots.includes(depotId)) {
      disabledDepots.push(depotId);
    }
    const newEnabledDepots = enabledDepots.filter((id) => id !== depotId);

    await this.prisma.featureFlag.update({
      where: { name: featureName },
      data: {
        enabledForDepots: JSON.stringify(newEnabledDepots),
        disabledForDepots: JSON.stringify(disabledDepots),
      },
    });

    this.clearCache();
  }

  /**
   * Habilitar feature para worker específico
   */
  async enableForWorker(featureName: string, workerId: string): Promise<void> {
    const flag = await this.getOrCreateFlag(featureName);

    const enabledWorkers = this.parseJsonArray(flag.enabledForWorkers);
    const disabledWorkers = this.parseJsonArray(flag.disabledForWorkers);

    if (!enabledWorkers.includes(workerId)) {
      enabledWorkers.push(workerId);
    }
    const newDisabledWorkers = disabledWorkers.filter((id) => id !== workerId);

    await this.prisma.featureFlag.update({
      where: { name: featureName },
      data: {
        enabledForWorkers: JSON.stringify(enabledWorkers),
        disabledForWorkers: JSON.stringify(newDisabledWorkers),
      },
    });

    this.clearCache();
  }

  /**
   * Deshabilitar feature para worker específico
   */
  async disableForWorker(featureName: string, workerId: string): Promise<void> {
    const flag = await this.getOrCreateFlag(featureName);

    const enabledWorkers = this.parseJsonArray(flag.enabledForWorkers);
    const disabledWorkers = this.parseJsonArray(flag.disabledForWorkers);

    if (!disabledWorkers.includes(workerId)) {
      disabledWorkers.push(workerId);
    }
    const newEnabledWorkers = enabledWorkers.filter((id) => id !== workerId);

    await this.prisma.featureFlag.update({
      where: { name: featureName },
      data: {
        enabledForWorkers: JSON.stringify(newEnabledWorkers),
        disabledForWorkers: JSON.stringify(disabledWorkers),
      },
    });

    this.clearCache();
  }

  /**
   * Crear o actualizar feature flag
   */
  async upsertFlag(
    name: string,
    data: {
      enabled?: boolean;
      description?: string;
      category?: string;
    },
  ): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { name },
      update: data,
      create: {
        name,
        enabled: data.enabled ?? true,
        description: data.description,
        category: data.category,
      },
    });

    this.clearCache();
  }

  /**
   * Listar todos los feature flags
   */
  async listAll() {
    return this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtener feature flag por nombre
   */
  async getFlag(name: string) {
    return this.prisma.featureFlag.findUnique({
      where: { name },
    });
  }

  /**
   * Eliminar feature flag
   */
  async deleteFlag(name: string): Promise<void> {
    await this.prisma.featureFlag.delete({
      where: { name },
    });

    this.clearCache();
  }

  /**
   * Helper: obtener o crear flag
   */
  private async getOrCreateFlag(name: string) {
    let flag = await this.prisma.featureFlag.findUnique({
      where: { name },
    });

    if (!flag) {
      flag = await this.prisma.featureFlag.create({
        data: {
          name,
          enabled: false,
          description: `Auto-created flag: ${name}`,
        },
      });
    }

    return flag;
  }

  /**
   * Helper: parse JSON array
   */
  private parseJsonArray(json: any): string[] {
    if (!json) return [];

    try {
      const parsed = JSON.parse(typeof json === 'string' ? json : JSON.stringify(json));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Helper: cache result
   */
  private cacheResult(key: string, enabled: boolean): void {
    this.flagCache.set(key, {
      enabled,
      timestamp: Date.now(),
    });
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.flagCache.clear();
    this.logger.debug('Feature flag cache cleared');
  }
}

/**
 * Nombres de feature flags del sistema
 */
export enum FeatureFlagName {
  // Validadores
  PHOTO_VALIDATION = 'PHOTO_VALIDATION',
  PATTERN_VALIDATION = 'PATTERN_VALIDATION',
  CRYPTOGRAPHIC_VALIDATION = 'CRYPTOGRAPHIC_VALIDATION',
  GEOLOCATION_VALIDATION = 'GEOLOCATION_VALIDATION',
  TEMPORAL_VALIDATION = 'TEMPORAL_VALIDATION',
  DEVICE_VALIDATION = 'DEVICE_VALIDATION',

  // Otras features
  WORK_SCHEDULES = 'WORK_SCHEDULES',
  EXCEPTION_CODES = 'EXCEPTION_CODES',
  OFFLINE_MODE = 'OFFLINE_MODE',
}
