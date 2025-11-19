import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';
import {
  FraudValidationConfig,
  DEFAULT_FRAUD_VALIDATION_CONFIG,
  PartialFraudValidationConfig,
  ConfigLevel,
} from '../../domain/types/fraud-validation-config.types';

/**
 * Servicio para gestionar configuraciones de validación anti-fraude
 * Implementa cascading configuration: GLOBAL → DEPOT → WORKER
 */
@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);

  // Cache en memoria (simple cache, en producción usar Redis)
  private configCache = new Map<string, { config: FraudValidationConfig; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener configuración con cascading: worker > depot > global
   */
  async getValidationConfig(
    depotId?: string,
    workerId?: string,
  ): Promise<FraudValidationConfig> {
    const cacheKey = `${workerId || 'null'}_${depotId || 'null'}`;

    // Check cache
    const cached = this.configCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Config cache hit for: ${cacheKey}`);
      return cached.config;
    }

    this.logger.debug(`Building cascading config for depot: ${depotId}, worker: ${workerId}`);

    // Cargar configs en paralelo
    const [globalConfig, depotConfig, workerConfig] = await Promise.all([
      this.loadGlobalConfig(),
      depotId ? this.loadDepotConfig(depotId) : null,
      workerId ? this.loadWorkerConfig(workerId) : null,
    ]);

    // Merge en orden de prioridad: global < depot < worker
    const mergedConfig = this.mergeConfigs(
      DEFAULT_FRAUD_VALIDATION_CONFIG,
      globalConfig,
      depotConfig,
      workerConfig,
    );

    // Cache result
    this.configCache.set(cacheKey, {
      config: mergedConfig,
      timestamp: Date.now(),
    });

    return mergedConfig;
  }

  /**
   * Cargar configuración global
   */
  private async loadGlobalConfig(): Promise<PartialFraudValidationConfig | null> {
    const config = await this.prisma.fraudValidationConfig.findFirst({
      where: {
        level: ConfigLevel.GLOBAL,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      this.logger.debug('No global config found, using defaults');
      return null;
    }

    return this.parseConfigJson(config.configJson as string);
  }

  /**
   * Cargar configuración de depot
   */
  private async loadDepotConfig(depotId: string): Promise<PartialFraudValidationConfig | null> {
    const config = await this.prisma.fraudValidationConfig.findFirst({
      where: {
        level: ConfigLevel.DEPOT,
        entityId: depotId,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      this.logger.debug(`No depot config found for: ${depotId}`);
      return null;
    }

    return this.parseConfigJson(config.configJson as string);
  }

  /**
   * Cargar configuración de worker
   */
  private async loadWorkerConfig(workerId: string): Promise<PartialFraudValidationConfig | null> {
    const config = await this.prisma.fraudValidationConfig.findFirst({
      where: {
        level: ConfigLevel.WORKER,
        entityId: workerId,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      this.logger.debug(`No worker config found for: ${workerId}`);
      return null;
    }

    return this.parseConfigJson(config.configJson as string);
  }

  /**
   * Merge configs con deep merge
   */
  private mergeConfigs(
    ...configs: (FraudValidationConfig | PartialFraudValidationConfig | null)[]
  ): FraudValidationConfig {
    let result: any = {};

    for (const config of configs) {
      if (config) {
        result = this.deepMerge(result, config);
      }
    }

    return result as FraudValidationConfig;
  }

  /**
   * Deep merge helper
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Parse config JSON con error handling
   */
  private parseConfigJson(configJson: string): PartialFraudValidationConfig | null {
    try {
      return JSON.parse(configJson);
    } catch (error) {
      this.logger.error(`Error parsing config JSON: ${error.message}`);
      return null;
    }
  }

  /**
   * Guardar/actualizar configuración
   */
  async upsertConfig(
    level: ConfigLevel,
    config: PartialFraudValidationConfig,
    entityId?: string,
    description?: string,
  ): Promise<void> {
    this.logger.log(`Upserting config for level: ${level}, entity: ${entityId || 'N/A'}`);

    // Buscar config existente
    const existing = await this.prisma.fraudValidationConfig.findUnique({
      where: {
        level_entityId: {
          level,
          entityId: entityId || null,
        },
      },
    });

    const configJson = JSON.stringify(config);

    if (existing) {
      // Update
      await this.prisma.fraudValidationConfig.update({
        where: { id: existing.id },
        data: {
          configJson,
          description,
          version: { increment: 1 },
        },
      });
    } else {
      // Create
      await this.prisma.fraudValidationConfig.create({
        data: {
          level,
          entityId: entityId || null,
          configJson,
          description,
          version: 1,
          isActive: true,
        },
      });
    }

    // Invalidar cache
    this.clearCache();

    this.logger.log(`Config upserted successfully`);
  }

  /**
   * Eliminar configuración
   */
  async deleteConfig(level: ConfigLevel, entityId?: string): Promise<void> {
    await this.prisma.fraudValidationConfig.updateMany({
      where: {
        level,
        entityId: entityId || null,
      },
      data: {
        isActive: false,
      },
    });

    this.clearCache();
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.configCache.clear();
    this.logger.debug('Config cache cleared');
  }

  /**
   * Obtener historial de configuraciones
   */
  async getConfigHistory(level: ConfigLevel, entityId?: string) {
    return this.prisma.fraudValidationConfig.findMany({
      where: {
        level,
        entityId: entityId || null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Restaurar configuración a una versión anterior
   */
  async restoreConfig(configId: string): Promise<void> {
    const config = await this.prisma.fraudValidationConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error(`Config not found: ${configId}`);
    }

    // Crear nueva versión con mismo contenido
    await this.prisma.fraudValidationConfig.create({
      data: {
        level: config.level,
        entityId: config.entityId,
        configJson: config.configJson,
        description: `Restored from version ${config.version}`,
        version: config.version + 1,
        isActive: true,
      },
    });

    this.clearCache();
  }
}
