import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class PrestarGuiaDto {
  @ApiPropertyOptional({ description: 'Fecha (YYYY-MM-DD). Default: hoy' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({ description: 'Observación (opcional): quién la usó, "no se usa"…' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observaciones?: string;
}
