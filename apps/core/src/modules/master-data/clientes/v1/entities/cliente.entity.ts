import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClienteEntity {
  @ApiProperty({
    description: 'ID del cliente',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Empresa XYZ S.A.',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'RUC del cliente',
    example: '1234567890001',
  })
  ruc?: string;

  @ApiPropertyOptional({
    description: 'Dirección del cliente',
    example: 'Av. Principal 123',
  })
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del cliente',
    example: '+593987654321',
  })
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email del cliente',
    example: 'contacto@empresa.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del cliente',
    example: 'Quito',
  })
  ciudad?: string;

  @ApiPropertyOptional({
    description: 'País del cliente',
    example: 'Ecuador',
  })
  pais?: string;

  @ApiPropertyOptional({
    description: 'Código de país del cliente',
    example: 'EC',
  })
  clienteCodigoPais?: string;

  @ApiPropertyOptional({
    description: 'Valor de fitosanitarios',
    example: 25.5,
  })
  fitosValor?: number;

  @ApiPropertyOptional({
    description: 'Costo del formulario A',
    example: 10,
  })
  formA?: number;

  @ApiPropertyOptional({
    description: 'Costo de transporte',
    example: 50,
  })
  transport?: number;

  @ApiPropertyOptional({
    description: 'Costo de termo',
    example: 15,
  })
  termo?: number;

  @ApiPropertyOptional({
    description: 'Costo de mica',
    example: 8,
  })
  mica?: number;

  @ApiPropertyOptional({
    description: 'Costo de handling',
    example: 12.5,
  })
  handling?: number;

  @ApiPropertyOptional({
    description: 'Cuenta contable',
    example: '410101',
  })
  cuentaContable?: string;

  @ApiPropertyOptional({
    description: 'Nombre para facturación',
    example: 'Empresa XYZ S.A.',
  })
  nombreFactura?: string;

  @ApiPropertyOptional({
    description: 'RUC para facturación',
    example: '1234567890001',
  })
  rucFactura?: string;

  @ApiPropertyOptional({
    description: 'Dirección para facturación',
    example: 'Av. Principal 123',
  })
  direccionFactura?: string;

  @ApiPropertyOptional({
    description: 'Teléfono para facturación',
    example: '+593987654321',
  })
  telefonoFactura?: string;

  @ApiProperty({
    description: 'Estado del cliente',
    example: true,
  })
  estado: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de actualización',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}