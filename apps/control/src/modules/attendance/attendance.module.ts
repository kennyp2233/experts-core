import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { BreakPolicyController } from './infrastructure/controllers/break-policy.controller';

// Use Cases
import { RecordEntryUseCase } from './application/use-cases/record-entry.use-case';
import { RecordExitUseCase } from './application/use-cases/record-exit.use-case';
import { ValidateAttendanceUseCase } from './application/use-cases/validate-attendance.use-case';
import { GetWorkerShiftHistoryUseCase } from './application/use-cases/get-worker-shift-history.use-case';
import { GetShiftAuditUseCase } from './application/use-cases/get-shift-audit.use-case';
import { GetWorkerDetailedStatsUseCase } from './application/use-cases/get-worker-detailed-stats.use-case';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { GetWorkerSummaryUseCase } from './application/use-cases/get-worker-summary.use-case';

// Application Services
import { AttendanceProcessingService } from './application/services/attendance-processing.service';
import { ValidationOrchestratorService } from './application/services/validation-orchestrator.service';

// Infrastructure Services
import { PhotoStorageService } from './infrastructure/services/photo-storage.service';
import { ConfigurationService } from './infrastructure/services/configuration.service';
import { FeatureFlagService } from './infrastructure/services/feature-flag.service';
import { WorkScheduleService } from './infrastructure/services/work-schedule.service';
import { FraudScoringService } from './infrastructure/services/fraud-scoring.service';
import { BreakPolicyService } from './infrastructure/services/break-policy.service';

// Domain Services
import { AntiFraudValidatorDomainService } from './domain/services/anti-fraud-validator.domain-service';
import { TemporalValidatorDomainService } from './domain/services/temporal-validator.domain-service';
import { GeolocationValidatorDomainService } from './domain/services/geolocation-validator.domain-service';
import { PhotoValidatorDomainService } from './domain/services/photo-validator.domain-service';
import { WorkHoursCalculatorDomainService } from './domain/services/work-hours-calculator.domain-service';
import { CryptographicValidatorDomainService } from './domain/services/cryptographic-validator.domain-service';
import { PatternValidatorDomainService } from './domain/services/pattern-validator.domain-service';

// Repository
import { AttendanceRepositoryInterface } from './domain/repositories/attendance.repository.interface';
import { AttendanceRepository } from './infrastructure/repositories/attendance.repository';

// External Dependencies (assuming PrismaService is available)
import { PrismaService } from '../../prisma.service'; // Adjust path as needed
import { ExceptionCodesModule } from '../exception-codes/exception-codes.module';
import { WorkersModule } from '../workers/workers.module';
import { AuthModule } from '../auth/auth.module';
import { WorkerAuthModule } from '../worker-auth/worker-auth.module';

@Module({
  imports: [ExceptionCodesModule, WorkersModule, AuthModule, WorkerAuthModule],
  controllers: [AttendanceController, BreakPolicyController],
  providers: [
    // External dependencies
    PrismaService,

    // Repository
    {
      provide: AttendanceRepositoryInterface,
      useClass: AttendanceRepository,
    },

    // Infrastructure Services (NEW: Configuration & Scheduling)
    ConfigurationService,
    FeatureFlagService,
    WorkScheduleService,
    FraudScoringService,
    BreakPolicyService,
    PhotoStorageService,

    // Domain Services (Validators implementan IFraudValidator)
    TemporalValidatorDomainService,
    GeolocationValidatorDomainService,
    PhotoValidatorDomainService,
    WorkHoursCalculatorDomainService,
    CryptographicValidatorDomainService,
    PatternValidatorDomainService,
    AntiFraudValidatorDomainService,

    // Application Services
    ValidationOrchestratorService, // Orchestrator with Strategy Pattern + Feature Flags
    AttendanceProcessingService,

    // Use Cases
    RecordEntryUseCase,
    RecordExitUseCase,
    ValidateAttendanceUseCase,
    GetWorkerShiftHistoryUseCase,
    GetShiftAuditUseCase,
    GetWorkerDetailedStatsUseCase,
    GetDashboardUseCase,
    GetWorkerSummaryUseCase,
  ],
  exports: [
    // Export services that other modules might need
    AttendanceRepositoryInterface,
    AntiFraudValidatorDomainService,
    ValidationOrchestratorService, // NEW: Export orchestrator
    AttendanceProcessingService,

    // Export new infrastructure services
    ConfigurationService,
    FeatureFlagService,
    WorkScheduleService,
    FraudScoringService,
    BreakPolicyService,

    // Export validators (todos implementan IFraudValidator)
    TemporalValidatorDomainService,
    GeolocationValidatorDomainService,
    PhotoValidatorDomainService,
    CryptographicValidatorDomainService,
    PatternValidatorDomainService,

    // Export use cases
    RecordEntryUseCase,
    RecordExitUseCase,
    ValidateAttendanceUseCase,
    GetWorkerShiftHistoryUseCase,
    GetShiftAuditUseCase,
    GetWorkerDetailedStatsUseCase,
    GetDashboardUseCase,
    GetWorkerSummaryUseCase,
  ],
})
export class AttendanceModule {
  constructor() {
    console.log('🚀 AttendanceModule initialized with anti-fraud capabilities');
  }
}
