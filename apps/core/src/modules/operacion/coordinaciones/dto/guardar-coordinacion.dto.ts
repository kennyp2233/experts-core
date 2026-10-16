import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineaCoordinacionDto {
  @ApiProperty() @IsInt() @Min(1)
  idFinca: number;

  @ApiProperty() @IsInt() @Min(1)
  idProducto: number;

  @ApiPropertyOptional({ description: 'Marca de la línea; por defecto la de la coordinación' })
  @IsOptional() @IsInt() @Min(1)
  idConsignatario?: number;

  @ApiProperty({ description: 'Cajas (piezas)' }) @IsInt() @Min(0)
  cantidadCajas: number;

  @ApiPropertyOptional({ description: 'Fulls; si no viene se calcula con el tipo de caja' })
  @IsOptional() @IsNumber() @Min(0)
  fulls?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  idTipoCaja?: number;

  @ApiProperty({ description: 'Peso en kg' }) @IsNumber() @Min(0)
  pesoKg: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  tallos?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  valor?: number;

  @ApiProperty({ description: 'DAE (055-AAAA-40-XXXXXXXX)', example: '055-2026-40-00751482' })
  @IsString() @MaxLength(25)
  dae: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  largo?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  ancho?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  alto?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  nota?: string;
}

export class TramoRutaDto {
  @ApiProperty({ enum: ['ORIGEN', 'DESTINO1', 'VIA1', 'DESTINO2', 'VIA2', 'DESTINO3', 'VIA3'] })
  @IsIn(['ORIGEN', 'DESTINO1', 'VIA1', 'DESTINO2', 'VIA2', 'DESTINO3', 'VIA3'])
  tipoRuta: 'ORIGEN' | 'DESTINO1' | 'VIA1' | 'DESTINO2' | 'VIA2' | 'DESTINO3' | 'VIA3';

  @ApiProperty({ description: 'Código IATA (aeropuerto o aerolínea)' }) @IsString() @MaxLength(5)
  codigo: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)
  vuelo?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  fechaHoraSalida?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  fechaHoraLlegada?: string;
}

/** Valores que el operador ingresa (o trae la aerolínea) para la liquidación. */
export class ValoresLiquidacionDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) pesoCobrable?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tarifa?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) guiaAerea?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) combustible?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) seguridad?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) otros?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) iva?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) handling?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cargoAwa?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cargoCha?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cargoPca?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cargoTax?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cargoMma?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cargoHawb?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cargoFitos?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) aux1?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) aux2?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) aux3Handling?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) calAux?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) auxOtros?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tarifaAcordada?: number;
}

/** Vuelo y manifiesto de carga (los da la aerolínea). */
export class VueloManifiestoDto {
  @ApiPropertyOptional({ example: '5Y9918' }) @IsOptional() @IsString() @MaxLength(20)
  vuelo?: string;

  @ApiPropertyOptional({ description: 'Salida del vuelo (ISO)' }) @IsOptional() @IsDateString()
  salida?: string;

  @ApiPropertyOptional({ description: 'Llegada del vuelo (ISO)' }) @IsOptional() @IsDateString()
  llegada?: string;

  @ApiPropertyOptional({ example: '052167', description: 'Número de manifiesto' })
  @IsOptional() @Matches(/^\d{1,6}$/, { message: 'El número de manifiesto son hasta 6 dígitos.' })
  numeroManifiesto?: string;

  @ApiPropertyOptional({ example: '0026', description: 'Secuencial de la guía en el manifiesto' })
  @IsOptional() @Matches(/^\d{1,5}$/, { message: 'El secuencial son hasta 5 dígitos.' })
  secuencial?: string;
}

export class GuardarCoordinacionDto {
  @ApiProperty({ description: 'Guía madre (AWB) del stock, disponible' }) @IsInt() @Min(1)
  idGuiaMadre: number;

  @ApiProperty({ description: 'Marca / consignatario principal' }) @IsInt() @Min(1)
  idConsignatario: number;

  @ApiProperty() @IsInt() @Min(1)
  idAgenciaIata: number;

  @ApiProperty({ description: 'Aeropuerto de destino de la guía' }) @IsInt() @Min(1)
  idDestinoAwb: number;

  @ApiPropertyOptional({ description: 'Destino final de los documentos; por defecto el de la guía' })
  @IsOptional() @IsInt() @Min(1)
  idDestinoFinalDocs?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  idTipoEmbarque?: number;

  @ApiProperty({ enum: ['PREPAID', 'COLLECT'] }) @IsIn(['PREPAID', 'COLLECT'])
  pago: 'PREPAID' | 'COLLECT';

  @ApiProperty({ description: 'Fecha de vuelo (YYYY-MM-DD)' }) @IsDateString()
  fechaVuelo: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  referencia?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  nota?: string;

  @ApiPropertyOptional({ type: [TramoRutaDto], description: 'Por defecto, la ruta de la aerolínea' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TramoRutaDto)
  rutas?: TramoRutaDto[];

  @ApiProperty({ type: [LineaCoordinacionDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => LineaCoordinacionDto)
  lineas: LineaCoordinacionDto[];

  @ApiPropertyOptional({ type: ValoresLiquidacionDto, description: 'Lo que cobra la aerolínea (va en la guía madre)' })
  @IsOptional() @ValidateNested() @Type(() => ValoresLiquidacionDto)
  liquidacion?: ValoresLiquidacionDto;

  @ApiPropertyOptional({
    type: ValoresLiquidacionDto,
    description: 'Lo que se le cobra al cliente, si es distinto de la guía madre (Access: "corte extra", campos *_ex)',
  })
  @IsOptional() @ValidateNested() @Type(() => ValoresLiquidacionDto)
  cobroCliente?: ValoresLiquidacionDto;

  @ApiPropertyOptional({ type: VueloManifiestoDto })
  @IsOptional() @ValidateNested() @Type(() => VueloManifiestoDto)
  vuelo?: VueloManifiestoDto;
}
