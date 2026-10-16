import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListarCoordinacionesDto {
  @ApiPropertyOptional({ description: 'AWB, guía hija (HAWB), DAE o número de coordinación' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  q?: string;

  @ApiPropertyOptional({ enum: ['BORRADOR', 'CORTADO', 'ANULADO'] })
  @IsOptional()
  @IsIn(['BORRADOR', 'CORTADO', 'ANULADO'])
  estado?: 'BORRADOR' | 'CORTADO' | 'ANULADO';

  @ApiPropertyOptional({ description: 'Fecha de vuelo desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ description: 'Fecha de vuelo hasta (YYYY-MM-DD, inclusive)' })
  @IsOptional()
  @IsDateString()
  hasta?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  idAerolinea?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  idConsignatario?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  idDestino?: number;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}
