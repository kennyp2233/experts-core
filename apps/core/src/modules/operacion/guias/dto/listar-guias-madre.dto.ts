import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListarGuiasMadreDto {
  @ApiPropertyOptional({ description: 'Número AWB (con o sin espacios)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  q?: string;

  @ApiPropertyOptional({ enum: ['INGRESADA', 'COORDINADA', 'PRESTADA'] })
  @IsOptional()
  @IsIn(['INGRESADA', 'COORDINADA', 'PRESTADA'])
  estado?: 'INGRESADA' | 'COORDINADA' | 'PRESTADA';

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  idAerolinea?: number;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  virtual?: 'true' | 'false';

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}
