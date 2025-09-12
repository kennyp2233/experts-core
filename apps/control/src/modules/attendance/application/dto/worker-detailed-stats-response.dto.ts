import { Expose, Type } from 'class-transformer';

export class StatsSnapshot {
  @Expose()
  workDays: number;

  @Expose()
  totalHours: number;

  @Expose()
  attendanceRate: number;

  @Expose()
  averageRiskScore: number;
}

export class WorkerDetailedStatsResponseDto {
  @Expose()
  workerId: string;

  @Expose()
  workerName: string;

  @Expose()
  depotId: string;

  @Expose()
  @Type(() => Object)
  dateRange: { from: Date; to: Date };

  @Expose()
  @Type(() => Object)
  attendance: {
    totalDays: number;
    workDays: number;
    absentDays: number;
    incompleteDays: number;
    attendanceRate: number;
  };

  @Expose()
  @Type(() => Object)
  hours: {
    totalHours: number;
    averageHoursPerDay: number;
    overtimeHours: number;
    undertimeHours: number;
    efficiency: number;
  };

  @Expose()
  @Type(() => Object)
  punctuality: {
    onTimeArrivals: number;
    lateArrivals: number;
    earlyDepartures: number;
    averageDelayMinutes: number;
    punctualityScore: number;
  };

  @Expose()
  @Type(() => Object)
  riskIndicators: {
    overallRiskScore: number;
    suspiciousRecords: number;
    fraudAlerts: number;
    manualReviewsRequired: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    topRiskFactors: string[];
  };

  @Expose()
  @Type(() => Object)
  patterns: {
    preferredArrivalTime: string;
    preferredDepartureTime: string;
    consistencyScore: number;
    weekdayPerformance: Array<{
      day: string;
      averageHours: number;
      attendanceRate: number;
    }>;
  };

  @Expose()
  @Type(() => Object)
  comparatives: {
    depotAverage: {
      attendanceRate: number;
      averageHours: number;
      punctualityScore: number;
    };
    ranking: {
      attendanceRank: number;
      hoursRank: number;
      punctualityRank: number;
      totalWorkers: number;
    };
  };

  @Expose()
  @Type(() => Object)
  trends: {
    last7Days: StatsSnapshot;
    last30Days: StatsSnapshot;
    last90Days: StatsSnapshot;
  };
}