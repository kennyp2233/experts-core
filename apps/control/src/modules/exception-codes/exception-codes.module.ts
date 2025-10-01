import { Module } from '@nestjs/common';
import { ExceptionCodesController } from './presentation/controllers/exception-codes.controller';

// Application Layer
import { ExceptionCodeService } from './application/services/exception-code.service';

// Use Cases
import { GenerateExceptionCodeUseCase } from './application/use-cases/generate-exception-code.use-case';
import { ValidateExceptionCodeUseCase } from './application/use-cases/validate-exception-code.use-case';
import { ListExceptionCodesUseCase } from './application/use-cases/list-exception-codes.use-case';

// Infrastructure
import { ExceptionCodeRepository } from './infrastructure/repositories/exception-code.repository';
import type { ExceptionCodeRepositoryInterface } from './domain/repositories/exception-code.repository.interface';
import { PrismaService } from '../../prisma.service';

// Token para inyección de dependencia del repositorio
const EXCEPTION_CODE_REPOSITORY = 'ExceptionCodeRepository';

@Module({
  controllers: [ExceptionCodesController],
  providers: [
    // Services
    ExceptionCodeService,

    // Use Cases
    GenerateExceptionCodeUseCase,
    ValidateExceptionCodeUseCase,
    ListExceptionCodesUseCase,

    // Infrastructure
    PrismaService,
    {
      provide: EXCEPTION_CODE_REPOSITORY,
      useClass: ExceptionCodeRepository,
    },
    {
      provide: 'ExceptionCodeRepositoryInterface',
      useExisting: EXCEPTION_CODE_REPOSITORY,
    },
  ],
  exports: [
    ExceptionCodeService,
  ],
})
export class ExceptionCodesModule {}