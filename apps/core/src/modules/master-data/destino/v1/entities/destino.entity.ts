import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DestinoEntity {
  @ApiProperty({
    description: 'ID del destino',
    example: 1,
  })
  id: number;

  @ApiPropertyOptional({
    description: 'Tag del destino',
    example: 'ECU-001',
  })
  tag?: string;

  @ApiPropertyOptional({
    description: 'Nombre del destino',
    example: 'Quito',
  })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Aeropuerto del destino',
    example: 'Aeropuerto Internacional Mariscal Sucre',
  })
  aeropuerto?: string;

  @ApiProperty({
    description: 'ID del país',
    example: 1,
  })
  idPais: number;

  @ApiPropertyOptional({
    description: 'ID SESA',
    example: 'SESA-2024-001',
  })
  sesaId?: string;

  @ApiPropertyOptional({
    description: 'Leyenda fitosanitaria',
    example: 'Destino con requisitos fitosanitarios especiales',
  })
  leyendaFito?: string;

  @ApiPropertyOptional({
    description: 'Cobro de fitosanitarios',
    example: true,
  })
  cobroFitos?: boolean;
}
