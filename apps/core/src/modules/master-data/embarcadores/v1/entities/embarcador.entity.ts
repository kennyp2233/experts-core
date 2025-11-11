import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmbarcadorEntity {
  @ApiProperty({
    description: 'ID del embarcador',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del embarcador',
    example: 'Juan Pérez',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Cédula de identidad',
    example: '1234567890',
  })
  ci?: string;

  @ApiPropertyOptional({
    description: 'Dirección del embarcador',
    example: 'Calle Principal 123',
  })
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del embarcador',
    example: '+593987654321',
  })
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email del embarcador',
    example: 'juan.perez@email.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del embarcador',
    example: 'Quito',
  })
  ciudad?: string;

  @ApiPropertyOptional({
    description: 'Provincia del embarcador',
    example: 'Pichincha',
  })
  provincia?: string;

  @ApiPropertyOptional({
    description: 'País del embarcador',
    example: 'Ecuador',
  })
  pais?: string;

  @ApiPropertyOptional({
    description: 'Código de país del embarcador',
    example: 'EC',
  })
  embarcadorCodigoPais?: string;

  @ApiPropertyOptional({
    description: 'Costo de handling',
    example: 15.5,
  })
  handling?: number;

  @ApiProperty({
    description: 'Estado del embarcador',
    example: true,
  })
  estado: boolean;
}
