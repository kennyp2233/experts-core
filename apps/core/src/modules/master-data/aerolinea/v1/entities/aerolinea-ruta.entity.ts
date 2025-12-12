import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AerolineaRuta, TipoRuta } from '@internal/datos-maestros-client';

export class AerolineaRutaEntity implements AerolineaRuta {
  @ApiProperty({
    description: 'ID único de la ruta',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID de la aerolínea',
    example: 1,
  })
  aerolineaId: number;

  @ApiProperty({
    description: 'Tipo de ruta',
    enum: TipoRuta,
    example: TipoRuta.ORIGEN,
  })
  tipoRuta: TipoRuta;

  @ApiPropertyOptional({
    description: 'ID del origen',
    example: 1,
  })
  origenId: number | null;

  @ApiPropertyOptional({
    description: 'ID del destino',
    example: 2,
  })
  destinoId: number | null;

  @ApiPropertyOptional({
    description: 'ID de la aerolínea vía',
    example: 3,
  })
  viaAerolineaId: number | null;

  @ApiPropertyOptional({
    description: 'Orden de la ruta',
    example: 1,
  })
  orden: number | null;

  // Relations will be added when importing
}