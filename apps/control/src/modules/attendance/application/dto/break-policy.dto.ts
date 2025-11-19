import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsArray, ValidateNested, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfigLevel } from '../../domain/types/fraud-validation-config.types';

/**
 * DTO para regla individual de break
 */
export class BreakRuleDto {
  @ApiProperty({
    description: 'Horas mínimas trabajadas para que aplique este break',
    example: 6,
    minimum: 0,
    maximum: 24,
  })
  @IsNumber()
  @Min(0)
  @Max(24)
  minHours: number;

  @ApiProperty({
    description: 'Minutos de break a deducir',
    example: 30,
    minimum: 0,
    maximum: 480,
  })
  @IsNumber()
  @Min(0)
  @Max(480) // Max 8 horas
  breakMinutes: number;

  @ApiPropertyOptional({
    description: 'Descripción opcional de la regla',
    example: 'Break legal obligatorio - Artículo 50 Código de Trabajo Ecuador',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Si es un requerimiento legal',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isLegalRequirement?: boolean;
}

/**
 * DTO para configuración de breaks
 */
export class BreakConfigurationDto {
  @ApiProperty({
    description: 'Lista de reglas de breaks ordenadas por minHours',
    type: [BreakRuleDto],
    example: [
      { minHours: 6, breakMinutes: 30, description: 'Break legal', isLegalRequirement: true },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakRuleDto)
  rules: BreakRuleDto[];

  @ApiPropertyOptional({
    description: 'Si se deben aplicar múltiples breaks acumulativamente',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  cumulativeBreaks?: boolean;
}

/**
 * DTO para crear política de breaks
 */
export class CreateBreakPolicyDto {
  @ApiProperty({
    description: 'Nivel de configuración',
    enum: ConfigLevel,
    example: ConfigLevel.GLOBAL,
  })
  @IsEnum(ConfigLevel)
  level: ConfigLevel;

  @ApiPropertyOptional({
    description: 'ID de la entidad (depotId o workerId). Null para GLOBAL.',
    example: 'depot-uuid-123',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiProperty({
    description: 'Configuración de breaks',
    type: BreakConfigurationDto,
  })
  @ValidateNested()
  @Type(() => BreakConfigurationDto)
  configuration: BreakConfigurationDto;

  @ApiProperty({
    description: 'Nombre de la política',
    example: 'Política Legal Ecuador',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la política',
    example: 'Política basada en el Código de Trabajo de Ecuador',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO para actualizar política de breaks
 */
export class UpdateBreakPolicyDto {
  @ApiPropertyOptional({
    description: 'Nueva configuración de breaks',
    type: BreakConfigurationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BreakConfigurationDto)
  configuration?: BreakConfigurationDto;

  @ApiPropertyOptional({
    description: 'Nuevo nombre de la política',
    example: 'Política Legal Ecuador Actualizada',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Nueva descripción',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Estado activo/inactivo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO para calcular breaks
 */
export class CalculateBreaksDto {
  @ApiProperty({
    description: 'Total de horas trabajadas',
    example: 8.5,
    minimum: 0,
    maximum: 24,
  })
  @IsNumber()
  @Min(0)
  @Max(24)
  totalHours: number;

  @ApiPropertyOptional({
    description: 'ID del depot (para cascading configuration)',
    example: 'depot-uuid-123',
  })
  @IsOptional()
  @IsUUID()
  depotId?: string;

  @ApiPropertyOptional({
    description: 'ID del trabajador (para cascading configuration)',
    example: 'worker-uuid-456',
  })
  @IsOptional()
  @IsUUID()
  workerId?: string;
}

/**
 * DTO para query params de listado
 */
export class ListBreakPoliciesQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por nivel de configuración',
    enum: ConfigLevel,
  })
  @IsOptional()
  @IsEnum(ConfigLevel)
  level?: ConfigLevel;

  @ApiPropertyOptional({
    description: 'Filtrar por entityId',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

/**
 * DTO para query params de configuración efectiva
 */
export class GetEffectiveConfigurationQueryDto {
  @ApiPropertyOptional({
    description: 'ID del depot',
  })
  @IsOptional()
  @IsUUID()
  depotId?: string;

  @ApiPropertyOptional({
    description: 'ID del trabajador',
  })
  @IsOptional()
  @IsUUID()
  workerId?: string;
}
