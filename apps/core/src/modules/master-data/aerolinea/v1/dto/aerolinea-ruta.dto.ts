import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoRuta } from '@internal/datos-maestros-client';

export class CreateAerolineaRutaDto {
  @ApiProperty({
    description: 'ID de la aerolínea',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  aerolineaId?: number;

  @ApiProperty({
    description: 'Tipo de ruta',
    enum: TipoRuta,
    example: TipoRuta.ORIGEN,
  })
  @IsEnum(TipoRuta)
  @IsNotEmpty()
  tipoRuta: TipoRuta;

  @ApiPropertyOptional({
    description: 'ID del origen (solo para ORIGEN)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  origenId?: number;

  @ApiPropertyOptional({
    description: 'ID del destino (solo para DESTINO1, DESTINO2, DESTINO3)',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  destinoId?: number;

  @ApiPropertyOptional({
    description: 'ID de la aerolínea vía (solo para VIA1, VIA2, VIA3)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  viaAerolineaId?: number;

  @ApiPropertyOptional({
    description: 'Orden de la ruta',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  orden?: number;
}

export class UpdateAerolineaRutaDto {
  @ApiPropertyOptional({
    description: 'Tipo de ruta',
    enum: TipoRuta,
    example: TipoRuta.ORIGEN,
  })
  @IsOptional()
  @IsEnum(TipoRuta)
  tipoRuta?: TipoRuta;

  @ApiPropertyOptional({
    description: 'ID del origen (solo para ORIGEN)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  origenId?: number;

  @ApiPropertyOptional({
    description: 'ID del destino (solo para DESTINO1, DESTINO2, DESTINO3)',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  destinoId?: number;

  @ApiPropertyOptional({
    description: 'ID de la aerolínea vía (solo para VIA1, VIA2, VIA3)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  viaAerolineaId?: number;

  @ApiPropertyOptional({
    description: 'Orden de la ruta',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  orden?: number;
}