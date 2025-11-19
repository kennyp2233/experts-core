/**
 * Tipos para configuración de validaciones anti-fraude
 */

export enum ConfigLevel {
  GLOBAL = 'GLOBAL',
  DEPOT = 'DEPOT',
  WORKER = 'WORKER',
}

/**
 * Configuración completa de validaciones anti-fraude
 */
export interface FraudValidationConfig {
  temporal: TemporalValidationConfig;
  cryptographic: CryptographicValidationConfig;
  geolocation: GeolocationValidationConfig;
  photo: PhotoValidationConfig;
  pattern: PatternValidationConfig;
  scoring: ScoringValidationConfig;
}

/**
 * Configuración de validaciones temporales
 */
export interface TemporalValidationConfig {
  // QR Timing
  qrToleranceMinutes: number;            // Default: 6
  qrExpirationWarningPercent: number;   // Default: 0.8 (80%)

  // Device Time
  deviceTimeToleranceMinutes: number;    // Default: 5

  // Record Sequence
  minRecordIntervalMinutes: number;      // Default: 1

  // Working Hours (deprecated - usar WorkSchedule en su lugar)
  /** @deprecated Use WorkSchedule instead */
  workingHours?: {
    entry: { start: number; end: number };
    exit: { start: number; end: number };
  };
}

/**
 * Configuración de validaciones criptográficas
 */
export interface CryptographicValidationConfig {
  // Algoritmo de hash
  hashAlgorithm: 'SHA256' | 'SHA512';    // Default: SHA256

  // Validación estricta
  strictValidation: boolean;             // Default: true

  // Permitir bypass con exception codes
  allowExceptionCodes: boolean;          // Default: true
}

/**
 * Configuración de validaciones de geolocalización
 */
export interface GeolocationValidationConfig {
  // Umbrales de precisión GPS (en metros)
  gpsAccuracyThresholds: {
    excellent: number;   // Default: 20m
    good: number;        // Default: 50m
    acceptable: number;  // Default: 150m
    poor: number;        // Default: 300m
  };

  // Velocidad de viaje (en km/h)
  maxTravelSpeedKmh: number;       // Default: 120
  suspiciousSpeedKmh: number;      // Default: 80

  // Tolerancia de ubicación
  locationToleranceMultiplier: number; // Default: 0.5 (50% de precisión GPS)
  maxToleranceMeters: number;          // Default: 100m

  // Detección de coordenadas sospechosas
  validateCoordinateRealism: boolean;  // Default: true
  minDecimalPlaces: number;            // Default: 3
}

/**
 * Configuración de validaciones fotográficas
 */
export interface PhotoValidationConfig {
  // Habilitar validación foto
  enabled: boolean;                    // Default: false (por feature flag)

  // Timeouts
  photoTimeToleranceMinutes: number;   // Default: 2

  // Tamaños de archivo
  minFileSizeBytes: number;            // Default: 50KB
  maxFileSizeBytes: number;            // Default: 10MB

  // Resolución
  minResolution: number;               // Default: 200x200

  // Aspect ratio
  minAspectRatio: number;              // Default: 0.5
  maxAspectRatio: number;              // Default: 3.0

  // Detección de screenshot
  enableScreenshotDetection: boolean;  // Default: true
  screenshotSuspicionThreshold: number; // Default: 50

  // Validación de recencia
  maxPhotoAgeMinutes: number;          // Default: 5
}

/**
 * Configuración de validaciones de patrones
 */
export interface PatternValidationConfig {
  // Validación de dispositivo
  validateDevice: boolean;             // Default: false

  // Entrada duplicada
  allowMultipleEntriesPerDay: boolean; // Default: false

  // Duración de turno
  minShiftHours: number;               // Default: 1
  maxShiftHours: number;               // Default: 16
  suspiciousShiftHours: number;        // Default: 12

  // Historial
  historyAnalysisEnabled: boolean;     // Default: true
  maxRecentRecordsToAnalyze: number;   // Default: 10
  suspiciousRecordsThreshold: number;  // Default: 3 (de 10)
}

/**
 * Configuración de scoring
 */
export interface ScoringValidationConfig {
  // Umbrales de decisión
  lowRiskThreshold: number;     // Default: 20  (0-20 = ACCEPTED)
  mediumRiskThreshold: number;  // Default: 60  (21-60 = SUSPICIOUS)
  highRiskThreshold: number;    // Default: 100 (61+ = REJECTED)

  // Umbral para revisión manual
  manualReviewThreshold: number; // Default: 40

  // Pesos por violación (se cargan de FraudWeightConfig)
  // Este campo es solo informativo, los pesos reales vienen de FraudWeightConfig
  usesDynamicWeights: boolean;   // Default: true
}

/**
 * Config parcial para updates
 */
export type PartialFraudValidationConfig = DeepPartial<FraudValidationConfig>;

/**
 * Helper type para partial recursivo
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Configuración por defecto del sistema
 */
export const DEFAULT_FRAUD_VALIDATION_CONFIG: FraudValidationConfig = {
  temporal: {
    qrToleranceMinutes: 6,
    qrExpirationWarningPercent: 0.8,
    deviceTimeToleranceMinutes: 5,
    minRecordIntervalMinutes: 1,
  },
  cryptographic: {
    hashAlgorithm: 'SHA256',
    strictValidation: true,
    allowExceptionCodes: true,
  },
  geolocation: {
    gpsAccuracyThresholds: {
      excellent: 20,
      good: 50,
      acceptable: 150,
      poor: 300,
    },
    maxTravelSpeedKmh: 120,
    suspiciousSpeedKmh: 80,
    locationToleranceMultiplier: 0.5,
    maxToleranceMeters: 100,
    validateCoordinateRealism: true,
    minDecimalPlaces: 3,
  },
  photo: {
    enabled: false, // Controlado por feature flag
    photoTimeToleranceMinutes: 2,
    minFileSizeBytes: 50 * 1024,
    maxFileSizeBytes: 10 * 1024 * 1024,
    minResolution: 200,
    minAspectRatio: 0.5,
    maxAspectRatio: 3.0,
    enableScreenshotDetection: true,
    screenshotSuspicionThreshold: 50,
    maxPhotoAgeMinutes: 5,
  },
  pattern: {
    validateDevice: false,
    allowMultipleEntriesPerDay: true,
    minShiftHours: 1,
    maxShiftHours: 16,
    suspiciousShiftHours: 12,
    historyAnalysisEnabled: true,
    maxRecentRecordsToAnalyze: 10,
    suspiciousRecordsThreshold: 3,
  },
  scoring: {
    lowRiskThreshold: 20,
    mediumRiskThreshold: 60,
    highRiskThreshold: 100,
    manualReviewThreshold: 40,
    usesDynamicWeights: true,
  },
};
