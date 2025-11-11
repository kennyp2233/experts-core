import { ApiProperty } from '@nestjs/swagger';

export class PaginationResponseDto<T> {
  @ApiProperty({
    description: 'Datos paginados',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Total de registros',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Número de registros saltados',
    example: 0,
  })
  skip: number;

  @ApiProperty({
    description: 'Número de registros obtenidos',
    example: 10,
  })
  take: number;
}