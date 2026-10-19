import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

/** Valores del formulario de un dato maestro, por clave de campo (ver formularios-maestros.ts). */
export class GuardarMaestroDto {
  @ApiProperty({ type: 'object', additionalProperties: true, example: { nombreFinca: 'ALTAS CUMBRES', tag: 'ALTAS CUMBRES' } })
  @IsObject()
  valores!: Record<string, unknown>;
}
