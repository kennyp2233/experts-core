import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmbarcadorDto {
  @ApiProperty({
    description: 'Nombre del embarcador',
    example: 'Juan Pérez',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Cédula de identidad',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  ci?: string;

  @ApiPropertyOptional({
    description: 'Dirección del embarcador',
    example: 'Calle Principal 123',
  })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del embarcador',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email del embarcador',
    example: 'juan.perez@email.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del embarcador',
    example: 'Quito',
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({
    description: 'Provincia del embarcador',
    example: 'Pichincha',
  })
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional({
    description: 'País del embarcador',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString()
  pais?: string;

  @ApiPropertyOptional({
    description: 'Código de país del embarcador',
    example: 'EC',
  })
  @IsOptional()
  @IsString()
  embarcadorCodigoPais?: string;

  @ApiPropertyOptional({
    description: 'Costo de handling',
    example: 15.5,
  })
  @IsOptional()
  @IsNumber()
  handling?: number;

  @ApiPropertyOptional({
    description: 'Estado del embarcador',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
