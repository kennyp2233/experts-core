import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Pestañas de la lista, como el sistema viejo (+ anulados). */
export const PESTANAS_INGRESO = ['todos', 'activos', 'cancelados', 'anulados'] as const;
export type PestanaIngreso = (typeof PESTANAS_INGRESO)[number];

export class ListarIngresosDto {
  @ApiPropertyOptional({ description: 'N° de ingreso, número de guía (con o sin guion) u observación' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  q?: string;

  @ApiPropertyOptional({
    enum: PESTANAS_INGRESO,
    description: 'todos (sin anulados) · activos (ingresado o con guías coordinadas) · cancelados (todas usadas) · anulados',
  })
  @IsOptional()
  @IsIn(PESTANAS_INGRESO)
  pestana?: PestanaIngreso;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  idAerolinea?: number;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}

/** Ingreso de guías (documento CGU del sistema viejo): cabecera + números de guía. */
export class GuardarIngresoDto {
  @ApiPropertyOptional({ description: 'Fecha de ingreso (YYYY-MM-DD). Default: hoy' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiProperty({ description: 'Aerolínea (define el prefijo de la guía)' })
  @IsInt()
  @Min(1)
  idAerolinea: number;

  @ApiPropertyOptional({ description: 'Agencia IATA con la que se reservó la guía (referencia del sistema viejo)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  idAgenciaIata?: number;

  @ApiPropertyOptional({ description: 'Referencia libre (si no se elige agencia, se guarda su código IATA)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  referencia?: string;

  @ApiProperty({ description: 'Tipo de stock: virtual (la aerolínea no imprime la guía) o normal' })
  @IsBoolean()
  virtual: boolean;

  @ApiProperty({
    description: 'Números de guía: 8 dígitos con el verificador o 7 sin él (sin el prefijo de la aerolínea)',
    example: ['84695461'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  guias: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  nota?: string;
}
