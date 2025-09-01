import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';

// Use Cases
import { RecordEntryUseCase } from './application/use-cases/record-entry.use-case';
import { RecordExitUseCase } from './application/use-cases/record-exit.use-case';
import { ValidateAttendanceUseCase } from './application/use-cases/validate-attendance.use-case';

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
import { WorkerAuthModule } from '../worker-auth/worker-auth.module';

@Module({
  imports: [WorkerAuthModule],
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
  ],
  exports: [
    // Export services that other modules might need
    AttendanceRepositoryInterface,
    AntiFraudValidatorDomainService,
    AttendanceProcessingService,
    RecordEntryUseCase,
    RecordExitUseCase,
    ValidateAttendanceUseCase,
  ],
})
export class AttendanceModule {
  constructor() {
    console.log('🚀 AttendanceModule initialized with anti-fraud capabilities');
  }
}
