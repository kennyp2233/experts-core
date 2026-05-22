import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para `PATCH /api/v1/integrations/ebf-portal/coordinaciones/:detalleId`.
 * Solo permite editar lo que el portal EBF permite editar: producto + counts
 * + variedades compuestas. AWB/HAWB/DAE/exportador/marcacion/vuelo son
 * INMUTABLES desde el modal de edición — si hay que corregir alguno, es
 * delete + recreate.
 *
 * Si el producto está locked (el portal detecta transacciones de bodega),
 * el back lo ignora silenciosamente — el campo `productoId` solo se aplica
 * cuando `productoLocked === false` en el `UpdateFormSpec`.
 */
export class UpdateCoordinacionDto {
  @ApiPropertyOptional({
    description:
      'ID del producto. Ignorado si el portal tiene el producto bloqueado.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  productoId?: number;

  @ApiPropertyOptional({ description: 'Full Box (solo para full-bxs)', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fbCoo?: number;

  @ApiProperty({ description: '1/2 (HB) piezas', example: 2 })
  @IsInt()
  @Min(0)
  hbCoo: number;

  @ApiProperty({ description: '1/4 (QB) piezas', example: 0 })
  @IsInt()
  @Min(0)
  qbCoo: number;

  @ApiProperty({ description: '1/8 (EB) piezas', example: 0 })
  @IsInt()
  @Min(0)
  ebCoo: number;

  @ApiPropertyOptional({
    description: 'IDs de productos compuestos (≥2) — solo si producto es compuesto.',
    example: [228, 337],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsInt({ each: true })
  @Type(() => Number)
  compoundProductos?: number[];
}
