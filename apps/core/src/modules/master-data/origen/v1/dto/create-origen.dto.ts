import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrigenDto {
  @ApiProperty({
    description: 'Nombre del origen',
    example: 'Quito',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Aeropuerto del origen',
    example: 'Aeropuerto Internacional Mariscal Sucre',
  })
  @IsOptional()
  @IsString()
  aeropuerto?: string;

  @ApiPropertyOptional({
    description: 'ID del país',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  idPais?: number;

  @ApiPropertyOptional({
    description: 'ID del CAE Aduana',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  idCaeAduana?: number;
}
