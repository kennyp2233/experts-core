import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubAgenciaDto {
  @ApiProperty({
    description: 'Nombre de la sub agencia',
    example: 'Sub Agencia Principal',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'CI/RUC de la sub agencia',
    example: '1234567890001',
  })
  @IsOptional()
  @IsString()
  ciRuc?: string;

  @ApiPropertyOptional({
    description: 'Dirección de la sub agencia',
    example: 'Av. Principal 123',
  })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de la sub agencia',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email de la sub agencia',
    example: 'contacto@subagencia.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Ciudad de la sub agencia',
    example: 'Quito',
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({
    description: 'País de la sub agencia',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString()
  pais?: string;

  @ApiPropertyOptional({
    description: 'Provincia de la sub agencia',
    example: 'Pichincha',
  })
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional({
    description: 'Representante de la sub agencia',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  representante?: string;

  @ApiPropertyOptional({
    description: 'Comisión de la sub agencia',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber()
  comision?: number;

  @ApiPropertyOptional({
    description: 'Estado de la sub agencia',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}