import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Pais {
  @ApiProperty({
    description: 'ID único del país',
    example: 1,
  })
  idPais: number;

  @ApiProperty({
    description: 'Siglas del país',
    example: 'EC',
  })
  siglasPais: string;

  @ApiProperty({
    description: 'Nombre del país',
    example: 'Ecuador',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'ID del país padre (para subdivisiones)',
    example: 1,
  })
  paisId?: number;

  @ApiPropertyOptional({
    description: 'ID del acuerdo arancelario',
    example: 1,
  })
  idAcuerdo?: number;

  @ApiProperty({
    description: 'Estado del país',
    example: true,
  })
  estado: boolean;
}