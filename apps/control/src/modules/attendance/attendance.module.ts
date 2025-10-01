import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';

// Use Cases
import { RecordEntryUseCase } from './application/use-cases/record-entry.use-case';
import { RecordExitUseCase } from './application/use-cases/record-exit.use-case';
import { ValidateAttendanceUseCase } from './application/use-cases/validate-attendance.use-case';
import { GetWorkerShiftHistoryUseCase } from './application/use-cases/get-worker-shift-history.use-case';
import { GetShiftAuditUseCase } from './application/use-cases/get-shift-audit.use-case';
import { GetWorkerDetailedStatsUseCase } from './application/use-cases/get-worker-detailed-stats.use-case';

// Application Services
import { AttendanceProcessingService } from './application/services/attendance-processing.service';

// Infrastructure Services  
import { PhotoStorageService } from './infrastructure/services/photo-storage.service';

// Domain Services
import { AntiFraudValidatorDomainService } from './domain/services/anti-fraud-validator.domain-service';
import { TemporalValidatorDomainService } from './domain/services/temporal-validator.domain-service';
import { GeolocationValidatorDomainService } from './domain/services/geolocation-validator.domain-service';
import { PhotoValidatorDomainService } from './domain/services/photo-validator.domain-service';
import { WorkHoursCalculatorDomainService } from './domain/services/work-hours-calculator.domain-service';

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
  controllers: [AttendanceController],
  providers: [
    // External dependencies
    PrismaService,
    
    // Repository
    {
      provide: AttendanceRepositoryInterface,
      useClass: AttendanceRepository,
    },
    
    // Domain Services
    TemporalValidatorDomainService,
    GeolocationValidatorDomainService,
    PhotoValidatorDomainService,
    WorkHoursCalculatorDomainService,
    AntiFraudValidatorDomainService,
    
    // Application Services
    AttendanceProcessingService,
    
    // Infrastructure Services
    PhotoStorageService,
    
    // Use Cases
    RecordEntryUseCase,
    RecordExitUseCase,
    ValidateAttendanceUseCase,
    GetWorkerShiftHistoryUseCase,
    GetShiftAuditUseCase,
    GetWorkerDetailedStatsUseCase,
  ],
  exports: [
    // Export services that other modules might need
    AttendanceRepositoryInterface,
    AntiFraudValidatorDomainService,
    AttendanceProcessingService,
    RecordEntryUseCase,
    RecordExitUseCase,
    ValidateAttendanceUseCase,
    GetWorkerShiftHistoryUseCase,
    GetShiftAuditUseCase,
    GetWorkerDetailedStatsUseCase,
  ],
})
export class AttendanceModule {
  constructor() {
    console.log('🚀 AttendanceModule initialized with anti-fraud capabilities');
  }
}
