import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrigenEntity {
  @ApiProperty({
    description: 'ID del origen',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del origen',
    example: 'Quito',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Aeropuerto del origen',
    example: 'Aeropuerto Internacional Mariscal Sucre',
  })
  aeropuerto?: string;

  @ApiPropertyOptional({
    description: 'ID del país',
    example: 1,
  })
  idPais?: number;

  @ApiPropertyOptional({
    description: 'ID del CAE Aduana',
    example: 1,
  })
  idCaeAduana?: number;
}
