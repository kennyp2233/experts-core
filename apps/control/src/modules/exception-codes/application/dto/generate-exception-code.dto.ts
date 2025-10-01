import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GenerateExceptionCodeDto {
  @IsString()
  workerId: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440) // 24 horas máximo
  expiresInMinutes?: number = 60; // 1 hora por defecto
}