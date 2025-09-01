export class ValidationErrorDto {
  level: string; // temporal | crypto | geo | photo | pattern
  error: string;
  severity: string; // warning | error | critical
  details?: any;
}

export class ValidationResultDto {
  recordId: string;
  status: string; // ACCEPTED | REJECTED | SUSPICIOUS
  fraudScore: number; // 0-100
  validationErrors: ValidationErrorDto[];
  processedAt: string;
  needsManualReview: boolean;
  recommendedAction: 'ACCEPT' | 'REVIEW' | 'REJECT';
  summary: string;
  validationDetails: {
    temporal: {
      passed: number;
      failed: number;
      suspicious: number;
    };
    cryptographic: {
      passed: number;
      failed: number;
      suspicious: number;
    };
    geolocation: {
      passed: number;
      failed: number;
      suspicious: number;
    };
    photo: {
      passed: number;
      failed: number;
      suspicious: number;
    };
    pattern: {
      passed: number;
      failed: number;
      suspicious: number;
    };
  };
}

export class PendingValidationDto {
  recordId: string;
  workerId: string;
  workerName: string;
  type: string;
  timestamp: string;
  qrCodeUsed: string;
  photoPath: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  deviceId: string;
  createdOffline: boolean;
  ageInMinutes: number;
}

export class PendingValidationResponseDto {
  records: PendingValidationDto[];
  total: number;
  oldestRecord?: {
    recordId: string;
    ageInMinutes: number;
  };
}

export class SuspiciousActivityDto {
  recordId: string;
  workerId: string;
  workerName: string;
  type: string;
  timestamp: string;
  fraudScore: number;
  suspiciousReasons: string[];
  location: {
    latitude: number;
    longitude: number;
    distance: number; // distance from depot
  };
  requiresAction: boolean;
}

export class SuspiciousActivityResponseDto {
  activities: SuspiciousActivityDto[];
  summary: {
    total: number;
    highRisk: number; // fraud score > 70
    mediumRisk: number; // fraud score 40-70
    requiresAction: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}
