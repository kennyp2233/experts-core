import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TipoEmbarqueEntity {
  @ApiProperty({
    description: 'ID del tipo de embarque',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del tipo de embarque',
    example: 'Embarque Aéreo',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'ID del tipo de carga',
    example: 1,
  })
  idTipoCarga?: number;

  @ApiPropertyOptional({
    description: 'ID del tipo de embalaje',
    example: 1,
  })
  idTipoEmbalaje?: number;

  @ApiPropertyOptional({
    description: 'Régimen del embarque',
    example: 'Exportación',
  })
  regimen?: string;

  @ApiPropertyOptional({
    description: 'Mercancía del embarque',
    example: 'Flores frescas',
  })
  mercancia?: string;

  @ApiPropertyOptional({
    description: 'Código armonizado de la mercancía',
    example: '0603110000',
  })
  harmonisedCommodity?: string;

  @ApiPropertyOptional({
    description: 'Tipo de carga relacionado',
  })
  carga?: any;

  @ApiPropertyOptional({
    description: 'Tipo de embalaje relacionado',
  })
  embalaje?: any;
}