import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

export class GenerateLoginQRDto {
  @IsString()
  @IsNotEmpty({ message: 'Worker ID es requerido' })
  workerId: string;

  @IsOptional()
  @IsInt({ message: 'Expiración debe ser un número entero' })
  @Min(5, { message: 'Mínimo 5 minutos de expiración' })
  @Max(1440, { message: 'Máximo 24 horas (1440 minutos) de expiración' })
  expiresInMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
