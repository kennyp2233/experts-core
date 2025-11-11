import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTipoEmbarqueDto {
  @ApiProperty({
    description: 'Nombre del tipo de embarque',
    example: 'Embarque Aéreo',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'ID del tipo de carga',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  idTipoCarga?: number;

  @ApiPropertyOptional({
    description: 'ID del tipo de embalaje',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  idTipoEmbalaje?: number;

  @ApiPropertyOptional({
    description: 'Régimen del embarque',
    example: 'Exportación',
  })
  @IsOptional()
  @IsString()
  regimen?: string;

  @ApiPropertyOptional({
    description: 'Mercancía del embarque',
    example: 'Flores frescas',
  })
  @IsOptional()
  @IsString()
  mercancia?: string;

  @ApiPropertyOptional({
    description: 'Código armonizado de la mercancía',
    example: '0603110000',
  })
  @IsOptional()
  @IsString()
  harmonisedCommodity?: string;
}