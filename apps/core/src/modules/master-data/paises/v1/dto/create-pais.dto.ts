import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaisDto {
  @ApiProperty({
    description: 'Siglas del país',
    example: 'EC',
  })
  @IsString()
  siglasPais: string;

  @ApiProperty({
    description: 'Nombre del país',
    example: 'Ecuador',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'ID del país padre (para subdivisiones)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  paisId?: number;

  @ApiPropertyOptional({
    description: 'ID del acuerdo arancelario',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  idAcuerdo?: number;

  @ApiPropertyOptional({
    description: 'Estado del país',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}

export class UpdatePaisDto {
  @ApiPropertyOptional({
    description: 'Siglas del país',
    example: 'EC',
  })
  @IsOptional()
  @IsString()
  siglasPais?: string;

  @ApiPropertyOptional({
    description: 'Nombre del país',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'ID del país padre (para subdivisiones)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  paisId?: number;

  @ApiPropertyOptional({
    description: 'ID del acuerdo arancelario',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  idAcuerdo?: number;

  @ApiPropertyOptional({
    description: 'Estado del país',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}