import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubAgenciaEntity {
  @ApiProperty({
    description: 'ID de la sub agencia',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre de la sub agencia',
    example: 'Sub Agencia Principal',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'CI/RUC de la sub agencia',
    example: '1234567890001',
  })
  ciRuc?: string;

  @ApiPropertyOptional({
    description: 'Dirección de la sub agencia',
    example: 'Av. Principal 123',
  })
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de la sub agencia',
    example: '+593987654321',
  })
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email de la sub agencia',
    example: 'contacto@subagencia.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Ciudad de la sub agencia',
    example: 'Quito',
  })
  ciudad?: string;

  @ApiPropertyOptional({
    description: 'País de la sub agencia',
    example: 'Ecuador',
  })
  pais?: string;

  @ApiPropertyOptional({
    description: 'Provincia de la sub agencia',
    example: 'Pichincha',
  })
  provincia?: string;

  @ApiPropertyOptional({
    description: 'Representante de la sub agencia',
    example: 'Juan Pérez',
  })
  representante?: string;

  @ApiPropertyOptional({
    description: 'Comisión de la sub agencia',
    example: 5.5,
  })
  comision?: number;

  @ApiPropertyOptional({
    description: 'Estado de la sub agencia',
    example: true,
  })
  estado?: boolean;
}