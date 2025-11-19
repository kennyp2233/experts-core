import { Injectable } from '@nestjs/common';
import { IFraudValidator, ValidatorCategory } from '../interfaces/fraud-validator.interface';
import { AttendanceRecordValidationData, ValidationContext } from './anti-fraud-validator.domain-service';
import { ValidationResult } from './temporal-validator.domain-service';
import { FraudReason } from '../enums/fraud-reason.enum';
import { CryptoUtils } from '../../../../utils/crypto.utils';
import { VALIDATION_MESSAGES } from '../constants/validation-messages.constants';

/**
 * Validador de seguridad criptográfica
 *
 * Responsabilidades:
 * - Validar firma criptográfica de QR codes
 * - Verificar autenticidad de códigos QR
 * - Detectar QR codes malformados o falsificados
 */
@Injectable()
export class CryptographicValidatorDomainService implements IFraudValidator {
  readonly name = 'CryptographicValidator';
  readonly category = ValidatorCategory.CRYPTOGRAPHIC;

  async validate(
    data: AttendanceRecordValidationData,
    context: ValidationContext,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Si se usó código de excepción, saltar validación criptográfica del QR
    if (data.exceptionCodeUsed) {
      results.push({
        isValid: true,
        isSuspicious: false,
        severity: 0,
        message: VALIDATION_MESSAGES.CRYPTOGRAPHIC.EXCEPTION_CODE_USED(),
      });
      return results;
    }

    // Si no hay qrCodeUsed, es un error
    if (!data.qrCodeUsed) {
      results.push({
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.MALFORMED_QR_CODE,
        message: VALIDATION_MESSAGES.CRYPTOGRAPHIC.NO_QR_PROVIDED(),
        severity: 40,
        details: {
          hasExceptionCode: !!data.exceptionCodeUsed,
        },
      });
      return results;
    }

    try {
      // Extraer timestamp y signature del QR JSON
      const qrTimestamp = this.extractTimestampFromQR(data.qrCodeUsed);
      const qrSignature = this.extractSignatureFromQR(data.qrCodeUsed);

      if (!qrSignature) {
        results.push({
          isValid: false,
          isSuspicious: false,
          reason: FraudReason.MALFORMED_QR_CODE,
          message: VALIDATION_MESSAGES.CRYPTOGRAPHIC.MISSING_SIGNATURE(),
          severity: 30,
          details: {
            qrData: data.qrCodeUsed?.substring(0, 100) + '...',
          },
        });
        return results;
      }

      // Validar autenticidad del QR usando la signature extraída
      const isValid = CryptoUtils.validateQRHash(
        qrSignature, // Usar la signature extraída en lugar del JSON completo
        context.depot.secret,
        context.depot.id,
        qrTimestamp || data.timestamp,
      );

      if (!isValid) {
        results.push({
          isValid: false,
          isSuspicious: false,
          reason: FraudReason.INVALID_QR_SIGNATURE,
          message: VALIDATION_MESSAGES.CRYPTOGRAPHIC.INVALID_SIGNATURE(),
          severity: 35,
          details: {
            qrSignature: qrSignature?.substring(0, 16) + '...',
            depotId: context.depot.id,
            timestamp: qrTimestamp?.toISOString() || data.timestamp.toISOString(),
          },
        });
      } else {
        results.push({
          isValid: true,
          isSuspicious: false,
          severity: 0,
          message: VALIDATION_MESSAGES.CRYPTOGRAPHIC.SIGNATURE_VALID(),
        });
      }
    } catch (error) {
      results.push({
        isValid: false,
        isSuspicious: false,
        reason: FraudReason.MALFORMED_QR_CODE,
        message: VALIDATION_MESSAGES.CRYPTOGRAPHIC.MALFORMED_QR(),
        severity: 30,
        details: {
          error: error instanceof Error ? error.message : 'Error desconocido',
          qrHash: data.qrCodeUsed,
        },
      });
    }

    return results;
  }

  /**
   * Extraer timestamp del QR
   */
  private extractTimestampFromQR(qrHash: string): Date | null {
    try {
      // El QR viene como JSON: {depotId, timestamp, signature}
      const qrJson = JSON.parse(qrHash);

      if (qrJson.timestamp) {
        const timestamp = new Date(qrJson.timestamp);
        return isNaN(timestamp.getTime()) ? null : timestamp;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extraer firma (hash) del QR code
   */
  private extractSignatureFromQR(qrData: string): string | null {
    try {
      // El QR viene como JSON: {depotId, timestamp, signature}
      const qrJson = JSON.parse(qrData);
      return qrJson.signature || null;
    } catch (error) {
      return null;
    }
  }
}
