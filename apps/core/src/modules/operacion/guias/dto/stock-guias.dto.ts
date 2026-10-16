import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class IngresarLoteDto {
  @ApiProperty({ description: 'Aerolínea (define el prefijo AWB)' })
  @IsInt()
  @Min(1)
  idAerolinea: number;

  @ApiProperty({ description: 'Primera guía: 8 dígitos con verificador o 7 sin él (ej. "8469 5461")', example: '84695461' })
  @IsString()
  @MaxLength(12)
  primeraGuia: string;

  @ApiProperty({ description: 'Cuántas guías consecutivas', minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  cantidad: number;

  @ApiPropertyOptional({ description: 'Guías virtuales (no impresas por la aerolínea)' })
  @IsOptional()
  @IsBoolean()
  virtual?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de ingreso (YYYY-MM-DD). Default: hoy' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  referencia?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  nota?: string;
}

export class PrestarGuiaDto {
  @ApiPropertyOptional({ description: 'Fecha (YYYY-MM-DD). Default: hoy' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({ description: 'A quién se prestó / observaciones' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observaciones?: string;
}
