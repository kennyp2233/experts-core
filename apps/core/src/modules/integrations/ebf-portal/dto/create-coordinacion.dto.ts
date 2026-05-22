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
 * DTO de creación de coordinación en EBF Portal. Los IDs salen del cascade
 * de selects (exportador → marcación → vuelo → DAE → producto). Los valores
 * numéricos siguen la nomenclatura del portal: FB=full box, HB=1/2, QB=1/4,
 * EB=1/8 (todas en piezas, números enteros).
 *
 * - `fbCoo` solo se acepta si el producto tiene `data-is-full-bxs="True"`.
 * - `compoundProductos` requerido (≥2 ids distintos al `productoId`) cuando
 *   el producto seleccionado tiene `data-is-compound-product="True"`.
 *
 * El service rechaza si la coordinación está fuera de ventana operativa
 * (ver `horarios.util.ts`).
 */
export class CreateCoordinacionDto {
  @ApiProperty({ description: 'ID del exportador (portal EBF).', example: 164 })
  @IsInt()
  exportadorId: number;

  @ApiProperty({
    description: 'ID de la marcación / consignatario.',
    example: 164,
  })
  @IsInt()
  consignatarioMarcacionId: number;

  @ApiProperty({
    description: 'ID del vuelo (doc_coordinacion en el portal).',
    example: 9721,
  })
  @IsInt()
  docCoordinacionId: number;

  @ApiProperty({ description: 'ID de la DAE.', example: 21566 })
  @IsInt()
  daeId: number;

  @ApiProperty({ description: 'ID del producto.', example: 1 })
  @IsInt()
  productoId: number;

  @ApiPropertyOptional({
    description: 'Full Box (solo aplica si el producto es full-bxs).',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fbCoo?: number;

  @ApiProperty({ description: '1/2 (HB) en piezas.', example: 0 })
  @IsInt()
  @Min(0)
  hbCoo: number;

  @ApiProperty({ description: '1/4 (QB) en piezas.', example: 0 })
  @IsInt()
  @Min(0)
  qbCoo: number;

  @ApiProperty({ description: '1/8 (EB) en piezas.', example: 0 })
  @IsInt()
  @Min(0)
  ebCoo: number;

  @ApiPropertyOptional({
    description:
      'IDs de productos compuestos (≥2). Requerido si el productoId es compuesto.',
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
