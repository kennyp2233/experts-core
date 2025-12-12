import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AerolineasPlantilla } from '@internal/datos-maestros-client';

export class AerolineaPlantillaEntity implements AerolineasPlantilla {
  @ApiProperty({
    description: 'ID de la aerolínea (clave primaria)',
    example: 1,
  })
  idAerolinea: number;

  @ApiPropertyOptional({
    description: 'Plantilla para guía madre',
    example: 'PLANTILLA_GUIA_MADRE',
  })
  plantillaGuiaMadre: string | null;

  @ApiPropertyOptional({
    description: 'Plantilla formato aerolínea',
    example: 'FORMATO_AEROLINEA',
  })
  plantillaFormatoAerolinea: string | null;

  @ApiPropertyOptional({
    description: 'Plantilla reservas',
    example: 'RESERVAS_TEMPLATE',
  })
  plantillaReservas: string | null;

  @ApiProperty({
    description: 'Tarifa rate',
    example: 15.75,
  })
  tarifaRate: number;

  @ApiProperty({
    description: 'PCA (Porcentaje de Costo Adicional)',
    example: 5.5,
  })
  pca: number;

  // Relations will be added when importing
}