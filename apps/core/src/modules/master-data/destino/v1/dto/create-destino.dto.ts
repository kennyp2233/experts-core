import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDestinoDto {
  @ApiPropertyOptional({
    description: 'Tag del destino',
    example: 'ECU-001',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Nombre del destino',
    example: 'Quito',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Aeropuerto del destino',
    example: 'Aeropuerto Internacional Mariscal Sucre',
  })
  @IsOptional()
  @IsString()
  aeropuerto?: string;

  @ApiProperty({
    description: 'ID del país',
    example: 1,
  })
  @IsNumber()
  idPais: number;

  @ApiPropertyOptional({
    description: 'ID SESA',
    example: 'SESA-2024-001',
  })
  @IsOptional()
  @IsString()
  sesaId?: string;

  @ApiPropertyOptional({
    description: 'Leyenda fitosanitaria',
    example: 'Destino con requisitos fitosanitarios especiales',
  })
  @IsOptional()
  @IsString()
  leyendaFito?: string;

  @ApiPropertyOptional({
    description: 'Cobro de fitosanitarios',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  cobroFitos?: boolean;
}
