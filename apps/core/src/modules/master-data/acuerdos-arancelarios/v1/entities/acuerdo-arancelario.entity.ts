import { ApiProperty } from '@nestjs/swagger';

export class AcuerdoArancelario {
  @ApiProperty({
    description: 'ID único del acuerdo arancelario',
    example: 1,
  })
  idAcuerdo: number;

  @ApiProperty({
    description: 'Nombre del acuerdo arancelario',
    example: 'Acuerdo de Libre Comercio',
  })
  nombre: string;
}