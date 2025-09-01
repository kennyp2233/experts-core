import { Module } from '@nestjs/common';
import { WorkerAuthController } from './worker-auth.controller';

// Application Layer
import { WorkerAuthService } from './application/services/worker-auth.service';
import { SessionManagerService } from './application/services/session-manager.service';

// Use Cases
import { GenerateWorkerLoginQRUseCase } from './application/use-cases/generate-worker-login-qr.use-case';
import { AuthenticateWorkerUseCase } from './application/use-cases/authenticate-worker.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { LogoutWorkerUseCase } from './application/use-cases/logout-worker.use-case';

// Domain Services
import { SessionValidatorDomainService } from './domain/services/session-validator.domain-service';

// Infrastructure
import { WorkerAuthRepository } from './infrastructure/repositories/worker-auth.repository';
import type { WorkerAuthRepositoryInterface } from './domain/repositories/worker-auth.repository.interface';
import { PrismaService } from '../../prisma.service';

// Guards
import { WorkerAuthGuard } from './guards/worker-auth.guard';

// Token para inyección de dependencia del repositorio
const WORKER_AUTH_REPOSITORY = 'WorkerAuthRepository';

@Module({
  controllers: [WorkerAuthController],
  providers: [
    // Services
    WorkerAuthService,
    SessionManagerService,
    
    // Use Cases
    GenerateWorkerLoginQRUseCase,
    AuthenticateWorkerUseCase,
    RefreshSessionUseCase,
    LogoutWorkerUseCase,
    
    // Domain Services
    SessionValidatorDomainService,
    
    // Infrastructure
    PrismaService,
    {
      provide: WORKER_AUTH_REPOSITORY,
      useClass: WorkerAuthRepository,
    },
    {
      provide: 'WorkerAuthRepositoryInterface',
      useExisting: WORKER_AUTH_REPOSITORY,
    },
    
    // Guards
    WorkerAuthGuard,
  ],
  exports: [
    WorkerAuthService,
    SessionManagerService,
    WorkerAuthGuard,
  ],
})
export class WorkerAuthModule {}
