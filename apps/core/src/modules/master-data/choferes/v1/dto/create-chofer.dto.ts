import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChoferDto {
  @ApiProperty({
    description: 'Nombre del chofer',
    example: 'Juan Pérez',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'RUC del chofer',
    example: '1234567890001',
  })
  @IsString()
  ruc: string;

  @ApiPropertyOptional({
    description: 'Placas del camión',
    example: 'ABC-123',
  })
  @IsOptional()
  @IsString()
  placasCamion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del chofer',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Información del camión',
    example: 'Camión Volvo 2020',
  })
  @IsOptional()
  @IsString()
  camion?: string;

  @ApiPropertyOptional({
    description: 'Estado del chofer',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}

export class UpdateChoferDto {
  @ApiPropertyOptional({
    description: 'Nombre del chofer',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'RUC del chofer',
    example: '1234567890001',
  })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({
    description: 'Placas del camión',
    example: 'ABC-123',
  })
  @IsOptional()
  @IsString()
  placasCamion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del chofer',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Información del camión',
    example: 'Camión Volvo 2020',
  })
  @IsOptional()
  @IsString()
  camion?: string;

  @ApiPropertyOptional({
    description: 'Estado del chofer',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}