import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClienteDto {
  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Empresa XYZ S.A.',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'RUC del cliente',
    example: '1234567890001',
  })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({
    description: 'Dirección del cliente',
    example: 'Av. Principal 123',
  })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del cliente',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email del cliente',
    example: 'contacto@empresa.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del cliente',
    example: 'Quito',
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({
    description: 'País del cliente',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString()
  pais?: string;

  @ApiPropertyOptional({
    description: 'Código de país del cliente',
    example: 'EC',
  })
  @IsOptional()
  @IsString()
  clienteCodigoPais?: string;

  @ApiPropertyOptional({
    description: 'Valor de fitosanitarios',
    example: 25.5,
  })
  @IsOptional()
  @IsNumber()
  fitosValor?: number;

  @ApiPropertyOptional({
    description: 'Costo del formulario A',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  formA?: number;

  @ApiPropertyOptional({
    description: 'Costo de transporte',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  transport?: number;

  @ApiPropertyOptional({
    description: 'Costo de termo',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  termo?: number;

  @ApiPropertyOptional({
    description: 'Costo de mica',
    example: 8,
  })
  @IsOptional()
  @IsNumber()
  mica?: number;

  @ApiPropertyOptional({
    description: 'Costo de handling',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber()
  handling?: number;

  @ApiPropertyOptional({
    description: 'Cuenta contable',
    example: '410101',
  })
  @IsOptional()
  @IsString()
  cuentaContable?: string;

  @ApiPropertyOptional({
    description: 'Nombre para facturación',
    example: 'Empresa XYZ S.A.',
  })
  @IsOptional()
  @IsString()
  nombreFactura?: string;

  @ApiPropertyOptional({
    description: 'RUC para facturación',
    example: '1234567890001',
  })
  @IsOptional()
  @IsString()
  rucFactura?: string;

  @ApiPropertyOptional({
    description: 'Dirección para facturación',
    example: 'Av. Principal 123',
  })
  @IsOptional()
  @IsString()
  direccionFactura?: string;

  @ApiPropertyOptional({
    description: 'Teléfono para facturación',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString()
  telefonoFactura?: string;

  @ApiPropertyOptional({
    description: 'Estado del cliente',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}