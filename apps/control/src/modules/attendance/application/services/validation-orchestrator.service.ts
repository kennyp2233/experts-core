import { Injectable, Logger } from '@nestjs/common';
import { IFraudValidator, ValidatorCategory } from '../../domain/interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext, ComprehensiveValidationResult } from '../../domain/services/anti-fraud-validator.domain-service';
import { ValidationResult } from '../../domain/services/temporal-validator.domain-service';
import { FraudScore } from '../../domain/value-objects/fraud-score.vo';
import { RecordStatus } from '../../domain/enums/record-status.enum';
import { FraudReason } from '../../domain/enums/fraud-reason.enum';
import { FeatureFlagService, FeatureFlagName } from '../../infrastructure/services/feature-flag.service';
import { VALIDATION_MESSAGES } from '../../domain/constants/validation-messages.constants';

// Domain validators (todos implementan IFraudValidator)
import { TemporalValidatorDomainService } from '../../domain/services/temporal-validator.domain-service';
import { GeolocationValidatorDomainService } from '../../domain/services/geolocation-validator.domain-service';
import { PhotoValidatorDomainService } from '../../domain/services/photo-validator.domain-service';
import { CryptographicValidatorDomainService } from '../../domain/services/cryptographic-validator.domain-service';
import { PatternValidatorDomainService } from '../../domain/services/pattern-validator.domain-service';

/**
 * Orquestador de validaciones anti-fraude
 *
 * Responsabilidades:
 * - Coordinar ejecución de validators
 * - Aplicar feature flags para habilitar/deshabilitar validators
 * - Combinar resultados y calcular scoring
 * - Determinar acción recomendada
 *
 * Usa patrón Strategy para composición flexible de validaciones
 */
@Injectable()
export class ValidationOrchestratorService {
  private readonly logger = new Logger(ValidationOrchestratorService.name);
  private readonly validators: Map<ValidatorCategory, IFraudValidator> = new Map();

  constructor(
    private readonly featureFlagService: FeatureFlagService,
    // Validators (todos implementan IFraudValidator)
    private readonly temporalValidator: TemporalValidatorDomainService,
    private readonly geolocationValidator: GeolocationValidatorDomainService,
    private readonly photoValidator: PhotoValidatorDomainService,
    private readonly cryptographicValidator: CryptographicValidatorDomainService,
    private readonly patternValidator: PatternValidatorDomainService,
  ) {
    // Registrar validators
    this.validators.set(ValidatorCategory.TEMPORAL, temporalValidator);
    this.validators.set(ValidatorCategory.CRYPTOGRAPHIC, cryptographicValidator);
    this.validators.set(ValidatorCategory.GEOLOCATION, geolocationValidator);
    this.validators.set(ValidatorCategory.PHOTO, photoValidator);
    this.validators.set(ValidatorCategory.PATTERN, patternValidator);
  }

  /**
   * Ejecutar todas las validaciones aplicables
   */
  async executeValidations(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ComprehensiveValidationResult> {
    const validationResults = {
      temporal: [] as ValidationResult[],
      cryptographic: [] as ValidationResult[],
      geolocation: [] as ValidationResult[],
      photo: [] as ValidationResult[],
      pattern: [] as ValidationResult[],
    };

    // Obtener depot y worker para feature flags
    const depotId = context.depot.id;
    const workerId = data.workerId;

    // Ejecutar validators según feature flags
    for (const [category, validator] of this.validators.entries()) {
      const isEnabled = await this.isValidatorEnabled(category, depotId, workerId);

      if (isEnabled) {
        try {
          this.logger.debug(`Executing validator: ${validator.name} for worker ${workerId}`);
          const results = await validator.validate(data, context);
          validationResults[category] = results;
        } catch (error) {
          this.logger.error(`Error in validator ${validator.name}:`, error);
          // Agregar resultado de error
          validationResults[category].push({
            isValid: false,
            isSuspicious: true,
            reason: FraudReason.UNUSUAL_WORK_HOURS, // Fallback reason
            message: `Error ejecutando validación ${category}: ${error.message}`,
            severity: 10,
            details: {
              error: error.message,
              validatorName: validator.name,
            },
          });
        }
      } else {
        this.logger.debug(`Validator ${validator.name} is disabled for worker ${workerId}`);
        // Agregar resultado de "skipped"
        validationResults[category].push({
          isValid: true,
          isSuspicious: false,
          severity: 0,
          message: `Validación ${category} deshabilitada por feature flag`,
        });
      }
    }

    // Combinar resultados y calcular puntuación final
    const fraudScore = this.calculateComprehensiveFraudScore(validationResults);
    const overallStatus = this.determineOverallStatus(fraudScore);
    const needsManualReview = fraudScore.needsManualReview();
    const recommendedAction = fraudScore.getRecommendedAction();
    const summary = this.generateValidationSummary(validationResults, fraudScore);

    return {
      overallStatus,
      fraudScore,
      validationResults,
      needsManualReview,
      recommendedAction,
      summary,
    };
  }

  /**
   * Verificar si un validator está habilitado
   */
  private async isValidatorEnabled(
    category: ValidatorCategory,
    depotId: string,
    workerId: string,
  ): Promise<boolean> {
    // Mapeo de categorías a feature flags
    const featureFlagMap: Record<ValidatorCategory, FeatureFlagName> = {
      [ValidatorCategory.TEMPORAL]: FeatureFlagName.TEMPORAL_VALIDATION,
      [ValidatorCategory.CRYPTOGRAPHIC]: FeatureFlagName.CRYPTOGRAPHIC_VALIDATION,
      [ValidatorCategory.GEOLOCATION]: FeatureFlagName.GEOLOCATION_VALIDATION,
      [ValidatorCategory.PHOTO]: FeatureFlagName.PHOTO_VALIDATION,
      [ValidatorCategory.PATTERN]: FeatureFlagName.PATTERN_VALIDATION,
    };

    const flagName = featureFlagMap[category];

    if (!flagName) {
      // Si no hay feature flag, está habilitado por defecto
      return true;
    }

    return this.featureFlagService.isEnabled(flagName, depotId, workerId);
  }

  /**
   * Calcular puntuación de fraude comprehensiva
   */
  private calculateComprehensiveFraudScore(
    validationResults: ComprehensiveValidationResult['validationResults'],
  ): FraudScore {
    const allResults = [
      ...validationResults.temporal,
      ...validationResults.cryptographic,
      ...validationResults.geolocation,
      ...validationResults.photo,
      ...validationResults.pattern,
    ];

    const violations = allResults
      .filter((result) => !result.isValid || result.isSuspicious)
      .map((result) => ({
        reason: result.reason || FraudReason.UNUSUAL_WORK_HOURS, // Default fallback
        severity: result.severity,
        details: result.details,
      }));

    return FraudScore.createFromViolations(violations);
  }

  /**
   * Determinar estado general
   */
  private determineOverallStatus(fraudScore: FraudScore): RecordStatus {
    if (fraudScore.isLowRisk()) {
      return RecordStatus.ACCEPTED;
    } else if (fraudScore.isMediumRisk()) {
      return RecordStatus.SUSPICIOUS;
    } else {
      return RecordStatus.REJECTED;
    }
  }

  /**
   * Generar resumen de validación
   */
  private generateValidationSummary(
    validationResults: ComprehensiveValidationResult['validationResults'],
    fraudScore: FraudScore,
  ): string {
    const categories = Object.keys(validationResults) as Array<keyof typeof validationResults>;
    const issues = categories
      .map((category) => {
        const results = validationResults[category];
        const problemCount = results.filter((r) => !r.isValid || r.isSuspicious).length;
        return problemCount > 0 ? `${category}: ${problemCount} issues` : null;
      })
      .filter(Boolean);

    if (issues.length === 0) {
      return VALIDATION_MESSAGES.GENERAL.ALL_VALIDATIONS_PASSED();
    }

    const action = fraudScore.getRecommendedAction();
    return VALIDATION_MESSAGES.GENERAL.VALIDATION_SUMMARY(
      action,
      issues.join(', '),
      fraudScore.score,
    );
  }
}
