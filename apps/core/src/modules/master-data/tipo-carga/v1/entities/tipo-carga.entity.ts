import { ApiProperty } from '@nestjs/swagger';

export class TipoCargaEntity {
  @ApiProperty({
    description: 'ID del tipo de carga',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del tipo de carga',
    example: 'Carga General',
  })
  nombre: string;
}