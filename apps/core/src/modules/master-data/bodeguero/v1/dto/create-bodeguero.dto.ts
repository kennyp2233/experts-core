import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBodegueroDto {
  @ApiProperty({
    description: 'Nombre del bodeguero',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Cédula de identidad del bodeguero',
    example: '0912345678',
  })
  @IsString()
  @IsNotEmpty()
  ci: string;

  @ApiProperty({
    description: 'Clave de bodega asignada al bodeguero',
    example: 'BOD001',
  })
  @IsString()
  @IsNotEmpty()
  claveBodega: string;

  @ApiPropertyOptional({
    description: 'Estado del bodeguero',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}

export class UpdateBodegueroDto {
  @ApiPropertyOptional({
    description: 'Nombre del bodeguero',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Cédula de identidad del bodeguero',
    example: '0912345678',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ci?: string;

  @ApiPropertyOptional({
    description: 'Clave de bodega asignada al bodeguero',
    example: 'BOD001',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  claveBodega?: string;

  @ApiPropertyOptional({
    description: 'Estado del bodeguero',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}