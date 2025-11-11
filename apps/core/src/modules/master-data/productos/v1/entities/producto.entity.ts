import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductoEntity {
  @ApiProperty({
    description: 'ID del producto',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Rosa Roja',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción del producto',
    example: 'Rosa roja premium de alta calidad',
  })
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Nombre botánico del producto',
    example: 'Rosa × damascena',
  })
  nombreBotanico?: string;

  @ApiPropertyOptional({
    description: 'Especie del producto',
    example: 'Rosa',
  })
  especie?: string;

  @ApiPropertyOptional({
    description: 'ID de la medida',
    example: 1,
  })
  medidaId?: number;

  @ApiPropertyOptional({
    description: 'Precio unitario del producto',
    example: '5.50',
  })
  precioUnitario?: string;

  @ApiProperty({
    description: 'Estado del producto',
    example: true,
  })
  estado: boolean;

  @ApiPropertyOptional({
    description: 'ID de la opción',
    example: 1,
  })
  opcionId?: number;

  @ApiPropertyOptional({
    description: 'Tallos por full',
    example: 25,
  })
  stemsPorFull?: number;

  @ApiPropertyOptional({
    description: 'ID SESA',
    example: 1,
  })
  sesaId?: number;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-11-10T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de actualización',
    example: '2024-11-10T12:00:00.000Z',
  })
  updatedAt: Date;
}
