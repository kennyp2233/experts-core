import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFuncionarioAgrocalidadDto {
  @ApiProperty({
    description: 'Nombre del funcionario de Agrocalidad',
    example: 'Juan Pérez',
  })
  @IsNotEmpty({ message: 'El nombre del funcionario es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Teléfono del funcionario',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email del funcionario',
    example: 'juan.perez@agrocalidad.gob.ec',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Estado del funcionario',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  estado?: boolean;
}

export class UpdateFuncionarioAgrocalidadDto {
  @ApiPropertyOptional({
    description: 'Nombre del funcionario de Agrocalidad',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del funcionario',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Email del funcionario',
    example: 'juan.perez@agrocalidad.gob.ec',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Estado del funcionario',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  estado?: boolean;
}