import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConceptoCosto, TipoConcepto, TipoMultiplicador } from '@internal/datos-maestros-client';

export class ConceptoCostoEntity implements ConceptoCosto {
  @ApiProperty({
    description: 'ID único del concepto de costo',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID de la plantilla',
    example: 1,
  })
  plantillaId: number;

  @ApiProperty({
    description: 'Tipo de concepto',
    enum: TipoConcepto,
    example: TipoConcepto.COSTO_GUIA,
  })
  tipo: TipoConcepto;

  @ApiPropertyOptional({
    description: 'Abreviatura del concepto',
    example: 'CG',
  })
  abreviatura: string | null;

  @ApiProperty({
    description: 'Valor del concepto',
    example: 10.5,
  })
  valor: number;

  @ApiPropertyOptional({
    description: 'Tipo de multiplicador',
    enum: TipoMultiplicador,
    example: TipoMultiplicador.GROSS_WEIGHT,
  })
  multiplicador: TipoMultiplicador | null;

  // Relations will be added when importing
}