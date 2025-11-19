/**
 * Tipos para configuración de pesos de fraude
 */

import { FraudReason } from '../enums/fraud-reason.enum';

/**
 * Pesos de severidad por cada tipo de violación
 */
export type FraudWeightsMap = Record<FraudReason, number>;

/**
 * Configuración completa de pesos
 */
export interface FraudWeightConfig {
  id: string;
  version: number;

  // A qué entidad aplica
  level: 'GLOBAL' | 'DEPOT' | 'WORKER';
  entityId?: string;

  // Pesos por tipo de violación
  weights: FraudWeightsMap;

  // Umbrales de decisión
  thresholds: {
    lowRisk: number;     // 0-20 = ACCEPTED
    mediumRisk: number;  // 21-60 = SUSPICIOUS
    highRisk: number;    // 61+ = REJECTED
  };

  // Metadata
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  description?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pesos por defecto del sistema
 */
export const DEFAULT_FRAUD_WEIGHTS: FraudWeightsMap = {
  // Temporal violations
  [FraudReason.QR_EXPIRED]: 30,
  [FraudReason.QR_FROM_FUTURE]: 30,

  // Cryptographic violations
  [FraudReason.INVALID_QR_SIGNATURE]: 35,
  [FraudReason.MALFORMED_QR_CODE]: 30,

  // Geolocation violations
  [FraudReason.LOCATION_OUT_OF_RANGE]: 35,
  [FraudReason.GPS_ACCURACY_TOO_LOW]: 30,
  [FraudReason.IMPOSSIBLE_TRAVEL_SPEED]: 35,

  // Photo violations
  [FraudReason.PHOTO_MISSING_METADATA]: 25,
  [FraudReason.PHOTO_TIMESTAMP_MISMATCH]: 30,
  [FraudReason.PHOTO_NOT_RECENT]: 20,
  [FraudReason.SUSPECTED_SCREENSHOT]: 35,

  // Pattern violations
  [FraudReason.DUPLICATE_ENTRY]: 30,
  [FraudReason.MISSING_EXIT_PREVIOUS_DAY]: 15,
  [FraudReason.INVALID_SHIFT_SEQUENCE]: 25,
  [FraudReason.UNUSUAL_WORK_HOURS]: 15,

  // Device violations
  [FraudReason.UNKNOWN_DEVICE]: 20,
  [FraudReason.DEVICE_TIME_MISMATCH]: 15,
};

/**
 * Umbrales por defecto
 */
export const DEFAULT_FRAUD_THRESHOLDS = {
  lowRisk: 20,
  mediumRisk: 60,
  highRisk: 100,
};

/**
 * DTO para crear/actualizar weights config
 */
export interface UpsertWeightConfigDto {
  level: 'GLOBAL' | 'DEPOT' | 'WORKER';
  entityId?: string;

  weights?: Partial<FraudWeightsMap>;
  thresholds?: {
    lowRisk?: number;
    mediumRisk?: number;
    highRisk?: number;
  };

  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

/**
 * Resultado de cálculo de score con detalles
 */
export interface DetailedScoreCalculation {
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedAction: 'ACCEPT' | 'REVIEW' | 'REJECT';

  violations: ScoredViolation[];

  config: {
    weightsVersion: number;
    weightsLevel: string;
    thresholds: {
      lowRisk: number;
      mediumRisk: number;
      highRisk: number;
    };
  };
}

/**
 * Violación con score calculado
 */
export interface ScoredViolation {
  reason: FraudReason;
  weight: number;
  score: number;
  category: ViolationCategory;
  details?: any;
}

/**
 * Categoría de violación
 */
export enum ViolationCategory {
  TEMPORAL = 'temporal',
  CRYPTOGRAPHIC = 'cryptographic',
  GEOLOCATION = 'geolocation',
  PHOTO = 'photo',
  PATTERN = 'pattern',
  DEVICE = 'device',
}

/**
 * Mapeo de FraudReason a ViolationCategory
 */
export const FRAUD_REASON_TO_CATEGORY: Record<FraudReason, ViolationCategory> = {
  [FraudReason.QR_EXPIRED]: ViolationCategory.TEMPORAL,
  [FraudReason.QR_FROM_FUTURE]: ViolationCategory.TEMPORAL,
  [FraudReason.INVALID_QR_SIGNATURE]: ViolationCategory.CRYPTOGRAPHIC,
  [FraudReason.MALFORMED_QR_CODE]: ViolationCategory.CRYPTOGRAPHIC,
  [FraudReason.LOCATION_OUT_OF_RANGE]: ViolationCategory.GEOLOCATION,
  [FraudReason.GPS_ACCURACY_TOO_LOW]: ViolationCategory.GEOLOCATION,
  [FraudReason.IMPOSSIBLE_TRAVEL_SPEED]: ViolationCategory.GEOLOCATION,
  [FraudReason.PHOTO_MISSING_METADATA]: ViolationCategory.PHOTO,
  [FraudReason.PHOTO_TIMESTAMP_MISMATCH]: ViolationCategory.PHOTO,
  [FraudReason.PHOTO_NOT_RECENT]: ViolationCategory.PHOTO,
  [FraudReason.SUSPECTED_SCREENSHOT]: ViolationCategory.PHOTO,
  [FraudReason.DUPLICATE_ENTRY]: ViolationCategory.PATTERN,
  [FraudReason.MISSING_EXIT_PREVIOUS_DAY]: ViolationCategory.PATTERN,
  [FraudReason.INVALID_SHIFT_SEQUENCE]: ViolationCategory.PATTERN,
  [FraudReason.UNUSUAL_WORK_HOURS]: ViolationCategory.PATTERN,
  [FraudReason.UNKNOWN_DEVICE]: ViolationCategory.DEVICE,
  [FraudReason.DEVICE_TIME_MISMATCH]: ViolationCategory.DEVICE,
};
