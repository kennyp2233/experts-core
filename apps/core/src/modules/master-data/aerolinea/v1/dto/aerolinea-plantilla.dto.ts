import { IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoConcepto, TipoMultiplicador } from '.prisma/productos-client';

export class CreateConceptoCostoDto {
  @ApiPropertyOptional({
    description: 'ID de la plantilla de aerolínea',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  plantillaId?: number;

  @ApiProperty({
    description: 'Tipo de concepto',
    enum: TipoConcepto,
    example: TipoConcepto.COSTO_GUIA,
  })
  @IsEnum(TipoConcepto)
  @IsNotEmpty()
  tipo: TipoConcepto;

  @ApiPropertyOptional({
    description: 'Abreviatura del concepto',
    example: 'CG',
  })
  @IsOptional()
  @IsString()
  abreviatura?: string;

  @ApiPropertyOptional({
    description: 'Valor del concepto',
    example: 10.5,
  })
  @IsOptional()
  @IsNumber()
  valor?: number;

  @ApiPropertyOptional({
    description: 'Tipo de multiplicador',
    enum: TipoMultiplicador,
    example: TipoMultiplicador.GROSS_WEIGHT,
  })
  @IsOptional()
  @IsEnum(TipoMultiplicador)
  multiplicador?: TipoMultiplicador;
}

export class UpdateConceptoCostoDto {
  @ApiPropertyOptional({
    description: 'Tipo de concepto',
    enum: TipoConcepto,
    example: TipoConcepto.COSTO_GUIA,
  })
  @IsOptional()
  @IsEnum(TipoConcepto)
  tipo?: TipoConcepto;

  @ApiPropertyOptional({
    description: 'Abreviatura del concepto',
    example: 'CG',
  })
  @IsOptional()
  @IsString()
  abreviatura?: string;

  @ApiPropertyOptional({
    description: 'Valor del concepto',
    example: 10.5,
  })
  @IsOptional()
  @IsNumber()
  valor?: number;

  @ApiPropertyOptional({
    description: 'Tipo de multiplicador',
    enum: TipoMultiplicador,
    example: TipoMultiplicador.GROSS_WEIGHT,
  })
  @IsOptional()
  @IsEnum(TipoMultiplicador)
  multiplicador?: TipoMultiplicador;
}

export class CreateAerolineaPlantillaDto {
  @ApiPropertyOptional({
    description: 'ID de la aerolínea',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  idAerolinea?: number;

  @ApiPropertyOptional({
    description: 'Plantilla para guía madre',
    example: 'PLANTILLA_GUIA_MADRE',
  })
  @IsOptional()
  @IsString()
  plantillaGuiaMadre?: string;

  @ApiPropertyOptional({
    description: 'Plantilla formato aerolínea',
    example: 'FORMATO_AEROLINEA',
  })
  @IsOptional()
  @IsString()
  plantillaFormatoAerolinea?: string;

  @ApiPropertyOptional({
    description: 'Plantilla reservas',
    example: 'RESERVAS_TEMPLATE',
  })
  @IsOptional()
  @IsString()
  plantillaReservas?: string;

  @ApiPropertyOptional({
    description: 'Tarifa rate',
    example: 15.75,
  })
  @IsOptional()
  @IsNumber()
  tarifaRate?: number;

  @ApiPropertyOptional({
    description: 'PCA (Porcentaje de Costo Adicional)',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber()
  pca?: number;

  @ApiPropertyOptional({
    description: 'Lista de conceptos de costo',
    type: [CreateConceptoCostoDto],
  })
  @IsOptional()
  conceptos?: CreateConceptoCostoDto[];
}

export class UpdateAerolineaPlantillaDto {
  @ApiPropertyOptional({
    description: 'Plantilla para guía madre',
    example: 'PLANTILLA_GUIA_MADRE',
  })
  @IsOptional()
  @IsString()
  plantillaGuiaMadre?: string;

  @ApiPropertyOptional({
    description: 'Plantilla formato aerolínea',
    example: 'FORMATO_AEROLINEA',
  })
  @IsOptional()
  @IsString()
  plantillaFormatoAerolinea?: string;

  @ApiPropertyOptional({
    description: 'Plantilla reservas',
    example: 'RESERVAS_TEMPLATE',
  })
  @IsOptional()
  @IsString()
  plantillaReservas?: string;

  @ApiPropertyOptional({
    description: 'Tarifa rate',
    example: 15.75,
  })
  @IsOptional()
  @IsNumber()
  tarifaRate?: number;

  @ApiPropertyOptional({
    description: 'PCA (Porcentaje de Costo Adicional)',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber()
  pca?: number;
}