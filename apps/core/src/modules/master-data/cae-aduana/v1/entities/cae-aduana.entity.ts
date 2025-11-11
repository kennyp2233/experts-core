import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CaeAduanaEntity {
  @ApiProperty({
    description: 'ID del CAE Aduana',
    example: 1,
  })
  idCaeAduana: number;

  @ApiPropertyOptional({
    description: 'Código de aduana',
    example: 123,
  })
  codigoAduana?: number;

  @ApiProperty({
    description: 'Nombre del CAE Aduana',
    example: 'CAE Quito Norte',
  })
  nombre: string;
}
