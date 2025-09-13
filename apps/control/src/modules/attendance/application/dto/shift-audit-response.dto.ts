import { Expose, Type } from 'class-transformer';

export class AuditRecordDto {
  @Expose()
  id: string;

  @Expose()
  type: 'ENTRY' | 'EXIT';

  @Expose()
  @Type(() => Date)
  timestamp: Date;

  @Expose()
  status: string;

  @Expose()
  @Type(() => Object)
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };

  @Expose()
  @Type(() => Object)
  photo: {
    hasPhoto: boolean;
    photoPath?: string;
    metadata?: any;
  };

  @Expose()
  @Type(() => Object)
  fraudValidation: {
    overallScore: number;
    qrValidation: { valid: boolean; score: number; issues: string[] };
    locationValidation: { valid: boolean; score: number; issues: string[] };
  };

  @Expose()
  @Type(() => Object)
  technical: {
    deviceId: string;
    createdOffline: boolean;
    syncStatus: string;
    qrTokenUsed: string;
    processedAt: Date;
  };
}

export class ShiftAuditResponseDto {
  @Expose()
  shiftId: string;

  @Expose()
  workerId: string;

  @Expose()
  workerName: string;

  @Expose()
  status: 'COMPLETE' | 'INCOMPLETE' | 'ACTIVE';

  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  totalHours: number | null;

  @Expose()
  @Type(() => AuditRecordDto)
  records: AuditRecordDto[];

  @Expose()
  @Type(() => Object)
  auditSummary: {
    overallRiskScore: number;
    hasRedFlags: boolean;
    needsManualReview: boolean;
    issuesFound: string[];
    validationsPerformed: number;
  };
}