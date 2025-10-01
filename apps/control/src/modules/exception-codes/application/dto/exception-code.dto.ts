import { Expose } from 'class-transformer';

export class ExceptionCodeResponseDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  workerId: string;

  @Expose()
  worker?: {
    employeeId: string;
    firstName: string;
    lastName: string;
  };

  @Expose()
  expiresAt: Date;

  @Expose()
  generatedAt: Date;
}

export class GenerateExceptionCodeResponseDto {
  success: boolean;
  data: ExceptionCodeResponseDto;
  message: string;
}