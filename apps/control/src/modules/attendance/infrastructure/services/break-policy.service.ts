import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';
import {
  BreakPolicy,
  BreakConfiguration,
  BreakRule,
  BreakCalculationResult,
  CreateBreakPolicyDto,
  UpdateBreakPolicyDto,
  DEFAULT_BREAK_CONFIGURATION,
} from '../../domain/types/break-policy.types';
import { ConfigLevel } from '../../domain/types/fraud-validation-config.types';

/**
 * Servicio para gestionar políticas de breaks (descansos)
 * Implementa cascading configuration: GLOBAL → DEPOT → WORKER
 */
@Injectable()
export class BreakPolicyService {
  private readonly logger = new Logger(BreakPolicyService.name);

  // Cache en memoria
  private policyCache = new Map<
    string,
    { configuration: BreakConfiguration; timestamp: number; policyId: string; level: ConfigLevel; name: string }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener configuración de breaks con cascading: worker > depot > global
   */
  async getBreakConfiguration(
    depotId?: string,
    workerId?: string,
  ): Promise<{
    configuration: BreakConfiguration;
    policyId: string;
    level: ConfigLevel;
    name: string;
  }> {
    const cacheKey = `${workerId || 'null'}_${depotId || 'null'}`;

    // Check cache
    const cached = this.policyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Break policy cache hit for: ${cacheKey}`);
      return {
        configuration: cached.configuration,
        policyId: cached.policyId,
        level: cached.level,
        name: cached.name,
      };
    }

    this.logger.debug(
      `Loading break policy for depot: ${depotId || 'N/A'}, worker: ${workerId || 'N/A'}`,
    );

    // Cargar policies en cascading order
    const [workerPolicy, depotPolicy, globalPolicy] = await Promise.all([
      workerId ? this.loadPolicyByLevel(ConfigLevel.WORKER, workerId) : null,
      depotId ? this.loadPolicyByLevel(ConfigLevel.DEPOT, depotId) : null,
      this.loadPolicyByLevel(ConfigLevel.GLOBAL, null),
    ]);

    // Aplicar cascading: worker > depot > global > default
    const effectivePolicy = workerPolicy || depotPolicy || globalPolicy;

    if (!effectivePolicy) {
      this.logger.warn('No break policy found, using default configuration');
      const defaultResult = {
        configuration: DEFAULT_BREAK_CONFIGURATION,
        policyId: 'default',
        level: ConfigLevel.GLOBAL,
        name: 'Default Break Policy',
      };

      // Cache default
      this.policyCache.set(cacheKey, {
        ...defaultResult,
        timestamp: Date.now(),
      });

      return defaultResult;
    }

    // Parse configuration
    const configuration = this.parseConfiguration(effectivePolicy.breakRulesJson);

    const result = {
      configuration,
      policyId: effectivePolicy.id,
      level: effectivePolicy.level,
      name: effectivePolicy.name,
    };

    // Cache result
    this.policyCache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Calcular breaks para un número de horas trabajadas
   */
  async calculateBreaks(
    totalHours: number,
    depotId?: string,
    workerId?: string,
  ): Promise<BreakCalculationResult> {
    const { configuration, policyId, level, name } = await this.getBreakConfiguration(
      depotId,
      workerId,
    );

    return this.calculateBreaksFromConfiguration(totalHours, configuration, {
      policyId,
      level,
      name,
    });
  }

  /**
   * Calcular breaks desde una configuración específica
   */
  calculateBreaksFromConfiguration(
    totalHours: number,
    configuration: BreakConfiguration,
    policyInfo: { policyId: string; level: ConfigLevel; name: string },
  ): BreakCalculationResult {
    const appliedRules: BreakCalculationResult['appliedRules'] = [];
    let totalBreakMinutes = 0;

    // Ordenar reglas por minHours descendente
    const sortedRules = [...configuration.rules].sort((a, b) => b.minHours - a.minHours);

    if (configuration.cumulativeBreaks) {
      // Modo acumulativo: aplicar todas las reglas que cumplan la condición
      for (const rule of sortedRules) {
        if (totalHours >= rule.minHours) {
          totalBreakMinutes += rule.breakMinutes;
          appliedRules.push({
            rule,
            applied: true,
            reason: `Worked ${totalHours.toFixed(2)} hours, >= ${rule.minHours} hours required`,
          });
        } else {
          appliedRules.push({
            rule,
            applied: false,
            reason: `Worked ${totalHours.toFixed(2)} hours, < ${rule.minHours} hours required`,
          });
        }
      }
    } else {
      // Modo no acumulativo: aplicar solo la regla de mayor minHours que cumpla
      let ruleApplied = false;

      for (const rule of sortedRules) {
        if (!ruleApplied && totalHours >= rule.minHours) {
          totalBreakMinutes = rule.breakMinutes;
          appliedRules.push({
            rule,
            applied: true,
            reason: `Highest applicable rule: ${totalHours.toFixed(2)} hours >= ${rule.minHours} hours`,
          });
          ruleApplied = true;
        } else {
          appliedRules.push({
            rule,
            applied: false,
            reason: ruleApplied
              ? 'Higher priority rule already applied'
              : `Worked ${totalHours.toFixed(2)} hours, < ${rule.minHours} hours required`,
          });
        }
      }
    }

    return {
      totalBreakMinutes,
      totalBreakHours: totalBreakMinutes / 60,
      appliedRules,
      policyUsed: policyInfo,
    };
  }

  /**
   * Crear nueva política de breaks
   */
  async createPolicy(dto: CreateBreakPolicyDto): Promise<BreakPolicy> {
    this.logger.log(
      `Creating break policy: ${dto.name} for level: ${dto.level}, entity: ${dto.entityId || 'N/A'}`,
    );

    // Validar configuración
    this.validateConfiguration(dto.configuration);

    const policy = await this.prisma.breakPolicy.create({
      data: {
        level: dto.level,
        entityId: dto.entityId || null,
        breakRulesJson: JSON.stringify(dto.configuration),
        name: dto.name,
        description: dto.description,
        version: 1,
        isActive: true,
      },
    });

    this.clearCache();
    return policy as BreakPolicy;
  }

  /**
   * Actualizar política existente
   */
  async updatePolicy(policyId: string, dto: UpdateBreakPolicyDto): Promise<BreakPolicy> {
    this.logger.log(`Updating break policy: ${policyId}`);

    const existing = await this.prisma.breakPolicy.findUnique({
      where: { id: policyId },
    });

    if (!existing) {
      throw new NotFoundException(`Break policy not found: ${policyId}`);
    }

    // Validar nueva configuración si se proporciona
    if (dto.configuration) {
      this.validateConfiguration(dto.configuration);
    }

    const updateData: any = {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    };

    if (dto.configuration) {
      updateData.breakRulesJson = JSON.stringify(dto.configuration);
      updateData.version = { increment: 1 };
    }

    const updated = await this.prisma.breakPolicy.update({
      where: { id: policyId },
      data: updateData,
    });

    this.clearCache();
    return updated as BreakPolicy;
  }

  /**
   * Obtener política por ID
   */
  async getPolicy(policyId: string): Promise<BreakPolicy> {
    const policy = await this.prisma.breakPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`Break policy not found: ${policyId}`);
    }

    return policy as BreakPolicy;
  }

  /**
   * Listar todas las políticas
   */
  async listPolicies(filters?: {
    level?: ConfigLevel;
    entityId?: string;
    isActive?: boolean;
  }): Promise<BreakPolicy[]> {
    const where: any = {};

    if (filters?.level) where.level = filters.level;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const policies = await this.prisma.breakPolicy.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return policies as BreakPolicy[];
  }

  /**
   * Eliminar política (soft delete)
   */
  async deletePolicy(policyId: string): Promise<void> {
    await this.prisma.breakPolicy.update({
      where: { id: policyId },
      data: { isActive: false },
    });

    this.clearCache();
    this.logger.log(`Break policy deactivated: ${policyId}`);
  }

  /**
   * Cargar policy por nivel y entityId
   */
  private async loadPolicyByLevel(
    level: ConfigLevel,
    entityId: string | null,
  ): Promise<BreakPolicy | null> {
    const policy = await this.prisma.breakPolicy.findFirst({
      where: {
        level,
        entityId: entityId || null,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    return policy as BreakPolicy | null;
  }

  /**
   * Parse configuration JSON
   */
  private parseConfiguration(configJson: string | any): BreakConfiguration {
    try {
      const parsed = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;

      if (!parsed.rules || !Array.isArray(parsed.rules)) {
        throw new Error('Invalid configuration: missing or invalid rules array');
      }

      return parsed as BreakConfiguration;
    } catch (error) {
      this.logger.error(`Error parsing break configuration: ${error.message}`);
      return DEFAULT_BREAK_CONFIGURATION;
    }
  }

  /**
   * Validar configuración
   */
  private validateConfiguration(config: BreakConfiguration): void {
    if (!config.rules || config.rules.length === 0) {
      throw new Error('Configuration must have at least one rule');
    }

    for (const rule of config.rules) {
      if (rule.minHours < 0) {
        throw new Error(`Invalid minHours: ${rule.minHours} (must be >= 0)`);
      }

      if (rule.breakMinutes < 0) {
        throw new Error(`Invalid breakMinutes: ${rule.breakMinutes} (must be >= 0)`);
      }

      if (rule.minHours > 24) {
        throw new Error(`Invalid minHours: ${rule.minHours} (cannot exceed 24 hours)`);
      }

      if (rule.breakMinutes > 480) {
        throw new Error(
          `Invalid breakMinutes: ${rule.breakMinutes} (cannot exceed 8 hours/480 minutes)`,
        );
      }
    }

    // Validar que no haya reglas duplicadas con el mismo minHours
    const minHoursSet = new Set(config.rules.map((r) => r.minHours));
    if (minHoursSet.size !== config.rules.length) {
      throw new Error('Configuration cannot have multiple rules with the same minHours');
    }
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.policyCache.clear();
    this.logger.debug('Break policy cache cleared');
  }
}
