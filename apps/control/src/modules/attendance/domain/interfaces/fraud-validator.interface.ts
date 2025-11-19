import { AttendanceRecordValidationData, ValidationContext } from '../services/anti-fraud-validator.domain-service';
import { ValidationResult } from '../services/temporal-validator.domain-service';

/**
 * Interface para todos los validadores de fraude
 * Implementa el patrón Strategy para permitir composición flexible de validaciones
 */
export interface IFraudValidator {
  /**
   * Nombre identificador del validator
   */
  readonly name: string;

  /**
   * Categoría del validator (temporal, cryptographic, geolocation, photo, pattern)
   */
  readonly category: ValidatorCategory;

  /**
   * Ejecutar validación
   * @param data - Datos del registro a validar
   * @param context - Contexto adicional para la validación
   * @returns Array de resultados de validación
   */
  validate(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]>;

  /**
   * Verificar si el validator está habilitado para este contexto
   * Útil para validators que tienen lógica de habilitación condicional
   */
  isEnabled?(context: ValidationContext): Promise<boolean>;
}

/**
 * Categorías de validadores
 */
export enum ValidatorCategory {
  TEMPORAL = 'temporal',
  CRYPTOGRAPHIC = 'cryptographic',
  GEOLOCATION = 'geolocation',
  PHOTO = 'photo',
  PATTERN = 'pattern',
}
