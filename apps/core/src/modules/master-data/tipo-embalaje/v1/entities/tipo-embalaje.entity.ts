import { ApiProperty } from '@nestjs/swagger';

export class TipoEmbalajeEntity {
  @ApiProperty({
    description: 'ID del tipo de embalaje',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del tipo de embalaje',
    example: 'Caja de cartón',
  })
  nombre: string;
}