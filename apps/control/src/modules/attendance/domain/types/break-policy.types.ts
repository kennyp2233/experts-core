import { ConfigLevel } from './fraud-validation-config.types';

/**
 * Regla individual de break
 * Define cuántos minutos de break se aplican cuando se trabajan X horas
 */
export interface BreakRule {
  /**
   * Horas mínimas trabajadas para que aplique este break
   */
  minHours: number;

  /**
   * Minutos de break a deducir
   */
  breakMinutes: number;

  /**
   * Descripción opcional de la regla
   * Ej: "Break legal obligatorio", "Almuerzo", "Refrigerio"
   */
  description?: string;

  /**
   * Si es obligatorio por ley
   */
  isLegalRequirement?: boolean;
}

/**
 * Configuración completa de breaks
 */
export interface BreakConfiguration {
  /**
   * Lista de reglas de breaks ordenadas por minHours ascendente
   */
  rules: BreakRule[];

  /**
   * Si se deben aplicar múltiples breaks acumulativamente
   * true: Se suman todos los breaks aplicables
   * false: Solo se aplica el break de la regla de mayor minHours que cumpla
   */
  cumulativeBreaks?: boolean;
}

/**
 * Política completa de breaks
 */
export interface BreakPolicy {
  id: string;
  version: number;
  level: ConfigLevel;
  entityId?: string;
  breakRulesJson: string; // JSON serializado de BreakConfiguration
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO para crear política de breaks
 */
export interface CreateBreakPolicyDto {
  level: ConfigLevel;
  entityId?: string;
  configuration: BreakConfiguration;
  name: string;
  description?: string;
}

/**
 * DTO para actualizar política de breaks
 */
export interface UpdateBreakPolicyDto {
  configuration?: BreakConfiguration;
  name?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * Resultado del cálculo de breaks
 */
export interface BreakCalculationResult {
  /**
   * Minutos totales de break deducidos
   */
  totalBreakMinutes: number;

  /**
   * Horas de break (totalBreakMinutes / 60)
   */
  totalBreakHours: number;

  /**
   * Reglas aplicadas
   */
  appliedRules: Array<{
    rule: BreakRule;
    applied: boolean;
    reason?: string;
  }>;

  /**
   * Configuración usada para el cálculo
   */
  policyUsed: {
    policyId: string;
    level: ConfigLevel;
    name: string;
  };
}

/**
 * Configuración por defecto (normativa laboral Ecuador)
 * Artículo 50 del Código de Trabajo:
 * - Jornada > 6 horas: 30 minutos de descanso
 */
export const DEFAULT_BREAK_CONFIGURATION: BreakConfiguration = {
  rules: [
    {
      minHours: 6,
      breakMinutes: 60,
      description: 'Break legal obligatorio - Artículo 50 Código de Trabajo Ecuador',
      isLegalRequirement: true,
    },
  ],
  cumulativeBreaks: false,
};

/**
 * Configuración ejemplo: breaks múltiples
 */
export const EXAMPLE_MULTIPLE_BREAKS_CONFIGURATION: BreakConfiguration = {
  rules: [
    {
      minHours: 4,
      breakMinutes: 15,
      description: 'Refrigerio corto',
      isLegalRequirement: false,
    },
    {
      minHours: 6,
      breakMinutes: 30,
      description: 'Almuerzo',
      isLegalRequirement: true,
    },
    {
      minHours: 10,
      breakMinutes: 15,
      description: 'Refrigerio adicional',
      isLegalRequirement: false,
    },
  ],
  cumulativeBreaks: true, // Total: 60 minutos si trabaja 10+ horas
};

/**
 * Configuración ejemplo: turnos largos
 */
export const EXAMPLE_LONG_SHIFT_CONFIGURATION: BreakConfiguration = {
  rules: [
    {
      minHours: 6,
      breakMinutes: 30,
      description: 'Break estándar',
      isLegalRequirement: true,
    },
    {
      minHours: 12,
      breakMinutes: 60,
      description: 'Break extendido para turno largo',
      isLegalRequirement: false,
    },
  ],
  cumulativeBreaks: false, // Solo el break de 60 min si trabaja 12+ horas
};
