import { FraudReason } from '../enums/fraud-reason.enum';

export class FraudScore {
  private static readonly MAX_SCORE = 100;
  private static readonly MIN_SCORE = 0;

  constructor(
    private readonly _score: number,
    private readonly _reasons: FraudReason[],
    private readonly _details: Record<string, any> = {},
  ) {
    this.validateScore();
  }

  static createClean(): FraudScore {
    return new FraudScore(0, []);
  }

  static createFromViolations(violations: Array<{ reason: FraudReason; severity: number; details?: any }>): FraudScore {
    let totalScore = 0;
    const reasons: FraudReason[] = [];
    const details: Record<string, any> = {};

    violations.forEach(violation => {
      totalScore += violation.severity;
      reasons.push(violation.reason);
      if (violation.details) {
        details[violation.reason] = violation.details;
      }
    });

    return new FraudScore(Math.min(totalScore, FraudScore.MAX_SCORE), reasons, details);
  }

  private validateScore(): void {
    if (this._score < FraudScore.MIN_SCORE || this._score > FraudScore.MAX_SCORE) {
      throw new Error(`Fraud score must be between ${FraudScore.MIN_SCORE} and ${FraudScore.MAX_SCORE}`);
    }
  }

  get score(): number {
    return this._score;
  }

  get reasons(): FraudReason[] {
    return [...this._reasons];
  }

  get details(): Record<string, any> {
    return { ...this._details };
  }

  /**
   * Add points to the fraud score
   */
  addViolation(reason: FraudReason, points: number, details?: any): FraudScore {
    const newScore = Math.min(this._score + points, FraudScore.MAX_SCORE);
    const newReasons = [...this._reasons, reason];
    const newDetails = { ...this._details };
    
    if (details) {
      newDetails[reason] = details;
    }

    return new FraudScore(newScore, newReasons, newDetails);
  }

  /**
   * Combine with another fraud score
   */
  combine(other: FraudScore): FraudScore {
    const combinedScore = Math.min(this._score + other._score, FraudScore.MAX_SCORE);
    const combinedReasons = [...this._reasons, ...other._reasons];
    const combinedDetails = { ...this._details, ...other._details };

    return new FraudScore(combinedScore, combinedReasons, combinedDetails);
  }

  /**
   * Check if score indicates low risk (green zone)
   */
  isLowRisk(threshold: number = 20): boolean {
    return this._score <= threshold;
  }

  /**
   * Check if score indicates medium risk (yellow zone)
   */
  isMediumRisk(lowThreshold: number = 20, highThreshold: number = 60): boolean {
    return this._score > lowThreshold && this._score <= highThreshold;
  }

  /**
   * Check if score indicates high risk (red zone)
   */
  isHighRisk(threshold: number = 60): boolean {
    return this._score > threshold;
  }

  /**
   * Check if manual review is needed
   */
  needsManualReview(threshold: number = 40): boolean {
    return this._score >= threshold;
  }

  /**
   * Get risk level as string
   */
  getRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (this.isLowRisk()) return 'LOW';
    if (this.isMediumRisk()) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Get recommended action based on score
   */
  getRecommendedAction(): 'ACCEPT' | 'REVIEW' | 'REJECT' {
    if (this.isLowRisk()) return 'ACCEPT';
    if (this.isMediumRisk()) return 'REVIEW';
    return 'REJECT';
  }

  /**
   * Check if has specific fraud reason
   */
  hasReason(reason: FraudReason): boolean {
    return this._reasons.includes(reason);
  }

  /**
   * Get count of violations by category
   */
  getViolationsByCategory(): Record<string, number> {
    const categories = {
      temporal: 0,
      cryptographic: 0,
      geolocation: 0,
      photo: 0,
      pattern: 0,
      device: 0,
    };

    this._reasons.forEach(reason => {
      if ([FraudReason.QR_EXPIRED, FraudReason.QR_FROM_FUTURE].includes(reason)) {
        categories.temporal++;
      } else if ([FraudReason.INVALID_QR_SIGNATURE, FraudReason.MALFORMED_QR_CODE].includes(reason)) {
        categories.cryptographic++;
      } else if ([
        FraudReason.LOCATION_OUT_OF_RANGE,
        FraudReason.GPS_ACCURACY_TOO_LOW,
        FraudReason.IMPOSSIBLE_TRAVEL_SPEED
      ].includes(reason)) {
        categories.geolocation++;
      } else if ([
        FraudReason.PHOTO_MISSING_METADATA,
        FraudReason.PHOTO_TIMESTAMP_MISMATCH,
        FraudReason.PHOTO_NOT_RECENT,
        FraudReason.SUSPECTED_SCREENSHOT
      ].includes(reason)) {
        categories.photo++;
      } else if ([
        FraudReason.DUPLICATE_ENTRY,
        FraudReason.MISSING_EXIT_PREVIOUS_DAY,
        FraudReason.INVALID_SHIFT_SEQUENCE,
        FraudReason.UNUSUAL_WORK_HOURS
      ].includes(reason)) {
        categories.pattern++;
      } else if ([
        FraudReason.UNKNOWN_DEVICE,
        FraudReason.DEVICE_TIME_MISMATCH
      ].includes(reason)) {
        categories.device++;
      }
    });

    return categories;
  }

  /**
   * Format score for display
   */
  formatScore(): string {
    const riskLevel = this.getRiskLevel();
    const reasonCount = this._reasons.length;
    
    return `${this._score}/100 (${riskLevel} risk, ${reasonCount} violation${reasonCount !== 1 ? 's' : ''})`;
  }

  equals(other: FraudScore): boolean {
    return this._score === other._score &&
           this._reasons.length === other._reasons.length &&
           this._reasons.every(reason => other._reasons.includes(reason));
  }

  toString(): string {
    return this.formatScore();
  }

  toJSON() {
    return {
      score: this._score,
      reasons: this._reasons,
      details: this._details,
      riskLevel: this.getRiskLevel(),
      recommendedAction: this.getRecommendedAction(),
      needsManualReview: this.needsManualReview(),
    };
  }
}
