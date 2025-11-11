import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Bodeguero {
  @ApiProperty({
    description: 'ID único del bodeguero',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del bodeguero',
    example: 'Juan Pérez',
  })
  nombre: string;

  @ApiProperty({
    description: 'Cédula de identidad del bodeguero',
    example: '0912345678',
  })
  ci: string;

  @ApiProperty({
    description: 'Clave de bodega asignada al bodeguero',
    example: 'BOD001',
  })
  claveBodega: string;

  @ApiPropertyOptional({
    description: 'Estado del bodeguero',
    example: true,
  })
  estado?: boolean;
}