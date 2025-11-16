import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OpcionProducto {
  SIMPLE = 'simple',
  COMPUESTO = 'compuesto',
}

export class ProductosArancelesDto {
  @ApiPropertyOptional({
    description: 'ID del arancel (opcional para crear)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Arancel destino',
    example: 'USA',
  })
  @IsOptional()
  @IsString()
  arancelesDestino?: string;

  @ApiPropertyOptional({
    description: 'Código arancel',
    example: '0603.10.10.00',
  })
  @IsOptional()
  @IsString()
  arancelesCodigo?: string;
}

export class ProductosCompuestoDto {
  @ApiPropertyOptional({
    description: 'ID del compuesto (opcional para crear)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Destino',
    example: 'Internacional',
  })
  @IsOptional()
  @IsString()
  destino?: string;

  @ApiPropertyOptional({
    description: 'Declaración',
    example: 'Producto compuesto de flores',
  })
  @IsOptional()
  @IsString()
  declaracion?: string;
}

export class ProductosMiProDto {
  @ApiPropertyOptional({
    description: 'ID del MiPro (opcional para crear)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Acuerdo',
    example: 'Acuerdo comercial XYZ',
  })
  @IsOptional()
  @IsString()
  acuerdo?: string;

  @ApiPropertyOptional({
    description: 'Código DJO',
    example: 'DJO-2024-001',
  })
  @IsOptional()
  @IsString()
  djoCode?: string;

  @ApiPropertyOptional({
    description: 'Código arancelario',
    example: 'TARIFF-2024-001',
  })
  @IsOptional()
  @IsString()
  tariffCode?: string;
}

export class CreateProductoDto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Rosa Roja',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción del producto',
    example: 'Rosa roja premium de alta calidad',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Nombre botánico del producto',
    example: 'Rosa × damascena',
  })
  @IsOptional()
  @IsString()
  nombreBotanico?: string;

  @ApiPropertyOptional({
    description: 'Especie del producto',
    example: 'Rosa',
  })
  @IsOptional()
  @IsString()
  especie?: string;

  @ApiProperty({
    description: 'ID de la medida',
    example: 1,
  })
  @IsNumber()
  medidaId: number;

  @ApiPropertyOptional({
    description: 'Precio unitario del producto',
    example: '5.50',
  })
  @IsOptional()
  precioUnitario?: string;

  @ApiPropertyOptional({
    description: 'Estado del producto',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @ApiPropertyOptional({
    description: 'Opción del producto',
    enum: OpcionProducto,
    example: OpcionProducto.SIMPLE,
  })
  @IsOptional()
  @IsEnum(OpcionProducto)
  opcionId?: OpcionProducto;

  @ApiPropertyOptional({
    description: 'Tallos por full',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  stemsPorFull?: number;

  @ApiPropertyOptional({
    description: 'ID SESA',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  sesaId?: number;

  @ApiPropertyOptional({
    description: 'Lista de aranceles del producto',
    type: [ProductosArancelesDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductosArancelesDto)
  productosAranceles?: ProductosArancelesDto[];

  @ApiPropertyOptional({
    description: 'Lista de productos compuestos',
    type: [ProductosCompuestoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductosCompuestoDto)
  productosCompuestos?: ProductosCompuestoDto[];

  @ApiPropertyOptional({
    description: 'Lista de productos MiPro',
    type: [ProductosMiProDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductosMiProDto)
  productosMiPros?: ProductosMiProDto[];
}
