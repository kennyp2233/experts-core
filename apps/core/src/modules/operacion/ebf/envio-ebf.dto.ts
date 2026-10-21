import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class FijarEquivalenciaDto {
  @ApiProperty({ description: 'Nombre como lo muestra EBF', example: 'MATIZ ROSES' })
  @IsString() @MaxLength(120)
  ebfNombre: string;

  @ApiPropertyOptional({ description: 'id en EBF; si no viene se busca por el nombre' })
  @IsOptional() @IsInt() @Min(1)
  ebfId?: number;
}

export class AprenderEquivalenciasDto {
  @ApiPropertyOptional({ description: 'Días hacia atrás del historial', default: 45 })
  @IsOptional() @IsInt() @Min(1) @Max(180)
  dias?: number;
}
