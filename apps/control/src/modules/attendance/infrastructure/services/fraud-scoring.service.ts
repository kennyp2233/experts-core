import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';
import { ConfigLevel, $Enums } from '@prisma/client';
import {
  FraudWeightConfig,
  FraudWeightsMap,
  DEFAULT_FRAUD_WEIGHTS,
  DEFAULT_FRAUD_THRESHOLDS,
  DetailedScoreCalculation,
  ScoredViolation,
  FRAUD_REASON_TO_CATEGORY,
  UpsertWeightConfigDto,
} from '../../domain/types/fraud-weights.types';
import { FraudReason } from '../../domain/enums/fraud-reason.enum';
import { FraudScore } from '../../domain/value-objects/fraud-score.vo';
import { RecordStatus } from '../../domain/enums/record-status.enum';

/**
 * Servicio para gestionar scoring de fraude con pesos dinámicos
 */
@Injectable()
export class FraudScoringService {
  private readonly logger = new Logger(FraudScoringService.name);

  // Cache de weights
  private weightsCache = new Map<string, { config: FraudWeightConfig; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcular score con pesos dinámicos
   */
  async calculateScore(
    violations: Array<{ reason: FraudReason; severity: number; details?: any }>,
    depotId?: string,
    workerId?: string,
  ): Promise<DetailedScoreCalculation> {
    // Obtener configuración de pesos
    const weightConfig = await this.getWeightsConfig(depotId, workerId);

    // Calcular score por cada violación
    const scoredViolations: ScoredViolation[] = [];
    let totalScore = 0;

    for (const violation of violations) {
      const weight = weightConfig.weights[violation.reason] ?? violation.severity;
      const score = weight;

      totalScore += score;

      scoredViolations.push({
        reason: violation.reason,
        weight,
        score,
        category: FRAUD_REASON_TO_CATEGORY[violation.reason],
        details: violation.details,
      });
    }

    // Limitar score al máximo
    totalScore = Math.min(totalScore, 100);

    // Determinar risk level
    const riskLevel = this.determineRiskLevel(totalScore, weightConfig.thresholds);
    const recommendedAction = this.getRecommendedAction(riskLevel);

    return {
      totalScore,
      riskLevel,
      recommendedAction,
      violations: scoredViolations,
      config: {
        weightsVersion: weightConfig.version,
        weightsLevel: weightConfig.level,
        thresholds: weightConfig.thresholds,
      },
    };
  }

  /**
   * Obtener configuración de pesos con cascading: worker > depot > global
   */
  async getWeightsConfig(
    depotId?: string,
    workerId?: string,
  ): Promise<FraudWeightConfig> {
    const cacheKey = `${workerId || 'null'}_${depotId || 'null'}`;

    // Check cache
    const cached = this.weightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.config;
    }

    // Cargar configs en paralelo
    const [globalConfig, depotConfig, workerConfig] = await Promise.all([
      this.loadGlobalWeights(),
      depotId ? this.loadDepotWeights(depotId) : null,
      workerId ? this.loadWorkerWeights(workerId) : null,
    ]);

    // Merge weights (prioridad: worker > depot > global > default)
    const mergedConfig = this.mergeWeightConfigs(
      globalConfig,
      depotConfig,
      workerConfig,
    );

    // Cache result
    this.weightsCache.set(cacheKey, {
      config: mergedConfig,
      timestamp: Date.now(),
    });

    return mergedConfig;
  }

  /**
   * Cargar pesos globales
   */
  private async loadGlobalWeights(): Promise<FraudWeightConfig | null> {
    const config = await this.prisma.fraudWeightConfig.findFirst({
      where: {
        level: 'GLOBAL',
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      return null;
    }

    return this.dbConfigToType(config);
  }

  /**
   * Cargar pesos de depot
   */
  private async loadDepotWeights(depotId: string): Promise<FraudWeightConfig | null> {
    const config = await this.prisma.fraudWeightConfig.findFirst({
      where: {
        level: 'DEPOT',
        entityId: depotId,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      return null;
    }

    return this.dbConfigToType(config);
  }

  /**
   * Cargar pesos de worker
   */
  private async loadWorkerWeights(workerId: string): Promise<FraudWeightConfig | null> {
    const config = await this.prisma.fraudWeightConfig.findFirst({
      where: {
        level: 'WORKER',
        entityId: workerId,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      return null;
    }

    return this.dbConfigToType(config);
  }

  /**
   * Merge de configuraciones de pesos
   */
  private mergeWeightConfigs(
    ...configs: (FraudWeightConfig | null)[]
  ): FraudWeightConfig {
    // Empezar con defaults
    let mergedWeights: FraudWeightsMap = { ...DEFAULT_FRAUD_WEIGHTS };
    let mergedThresholds = { ...DEFAULT_FRAUD_THRESHOLDS };
    let resultConfig: Partial<FraudWeightConfig> = {
      level: 'GLOBAL',
      version: 1,
      isActive: true,
    };

    // Merge cada config
    for (const config of configs) {
      if (config) {
        mergedWeights = { ...mergedWeights, ...config.weights };
        mergedThresholds = { ...mergedThresholds, ...config.thresholds };
        resultConfig = {
          ...resultConfig,
          level: config.level,
          version: config.version,
          entityId: config.entityId,
        };
      }
    }

    return {
      id: resultConfig.id || 'default',
      version: resultConfig.version || 1,
      level: resultConfig.level as any,
      entityId: resultConfig.entityId,
      weights: mergedWeights,
      thresholds: mergedThresholds,
      effectiveFrom: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Convertir DB record a tipo
   */
  private dbConfigToType(dbConfig: any): FraudWeightConfig {
    const weights = JSON.parse(dbConfig.weightsJson) as FraudWeightsMap;

    return {
      id: dbConfig.id,
      version: dbConfig.version,
      level: dbConfig.level,
      entityId: dbConfig.entityId,
      weights,
      thresholds: {
        lowRisk: dbConfig.lowRiskThreshold,
        mediumRisk: dbConfig.mediumRiskThreshold,
        highRisk: dbConfig.highRiskThreshold,
      },
      effectiveFrom: dbConfig.effectiveFrom,
      effectiveTo: dbConfig.effectiveTo,
      isActive: dbConfig.isActive,
      description: dbConfig.description,
      createdAt: dbConfig.createdAt,
      updatedAt: dbConfig.updatedAt,
    };
  }

  /**
   * Determinar nivel de riesgo
   */
  private determineRiskLevel(
    score: number,
    thresholds: { lowRisk: number; mediumRisk: number; highRisk: number },
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score <= thresholds.lowRisk) return 'LOW';
    if (score <= thresholds.mediumRisk) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Obtener acción recomendada
   */
  private getRecommendedAction(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  ): 'ACCEPT' | 'REVIEW' | 'REJECT' {
    if (riskLevel === 'LOW') return 'ACCEPT';
    if (riskLevel === 'MEDIUM') return 'REVIEW';
    return 'REJECT';
  }

  /**
   * Determinar RecordStatus desde DetailedScoreCalculation
   */
  determineRecordStatus(calculation: DetailedScoreCalculation): RecordStatus {
    if (calculation.riskLevel === 'LOW') return RecordStatus.ACCEPTED;
    if (calculation.riskLevel === 'MEDIUM') return RecordStatus.SUSPICIOUS;
    return RecordStatus.REJECTED;
  }

  /**
   * CRUD Operations
   */

  async upsertWeightConfig(dto: UpsertWeightConfigDto): Promise<void> {
    this.logger.log(`Upserting weight config for level: ${dto.level}, entity: ${dto.entityId || 'N/A'}`);

    // Buscar config existente
    const existing = await this.prisma.fraudWeightConfig.findFirst({
      where: {
        level: dto.level,
        entityId: dto.entityId || null,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    // Si existe, cargar pesos actuales y hacer merge
    let weights: Partial<FraudWeightsMap> = existing
      ? JSON.parse(existing.weightsJson as string)
      : { ...DEFAULT_FRAUD_WEIGHTS };

    if (dto.weights) {
      weights = { ...weights, ...dto.weights };
    }

    const weightsJson = JSON.stringify(weights);

    // Thresholds
    const lowRiskThreshold = dto.thresholds?.lowRisk ?? existing?.lowRiskThreshold ?? 20;
    const mediumRiskThreshold =
      dto.thresholds?.mediumRisk ?? existing?.mediumRiskThreshold ?? 60;
    const highRiskThreshold =
      dto.thresholds?.highRisk ?? existing?.highRiskThreshold ?? 100;

    if (existing) {
      // Desactivar versión anterior
      await this.prisma.fraudWeightConfig.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }

    // Crear nueva versión
    await this.prisma.fraudWeightConfig.create({
      data: {
        level: dto.level,
        entityId: dto.entityId || null,
        version: existing ? existing.version + 1 : 1,
        weightsJson,
        lowRiskThreshold,
        mediumRiskThreshold,
        highRiskThreshold,
        effectiveFrom: dto.effectiveFrom || new Date(),
        effectiveTo: dto.effectiveTo,
        isActive: true,
        description: dto.description,
      },
    });

    this.clearCache();
  }

  async getConfigHistory(level: string, entityId?: string) {
    return this.prisma.fraudWeightConfig.findMany({
      where: {
        level: level as ConfigLevel,
        entityId: entityId || null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.weightsCache.clear();
    this.logger.debug('Fraud weights cache cleared');
  }
}
