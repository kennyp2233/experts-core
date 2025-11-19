import { IsOptional, IsInt, Min, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para query params del resumen de trabajador
 */
export class GetWorkerSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio (ISO 8601). Si no se especifica, usa último mes',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin (ISO 8601). Si no se especifica, usa fecha actual',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Número de página (comienza en 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Tamaño de página (número de turnos por página)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
