import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedidaDto {
  @ApiProperty({
    description: 'Nombre de la medida',
    example: 'Kilogramo',
  })
  @IsNotEmpty({ message: 'El nombre de la medida es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Estado de la medida',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  estado?: boolean;
}

export class UpdateMedidaDto {
  @ApiPropertyOptional({
    description: 'Nombre de la medida',
    example: 'Kilogramo',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Estado de la medida',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  estado?: boolean;
}