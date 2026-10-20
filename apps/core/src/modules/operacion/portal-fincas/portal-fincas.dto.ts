import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const PATRON_DAE = /^\d{3}-\d{4}-\d{2}-\d{8}$/;

/**
 * Lo que carga la finca en una guía: producto, cajas (el portal las pide por tipo,
 * como EBF, y manda fulls y piezas), kg y cuál de sus DAE registradas usa.
 * Factura, valor y tallos son opcionales: normalmente no los sube y se completan
 * con los parámetros.
 */
export class LineaFincaDto {
  @ApiProperty() @IsInt() @Min(1)
  idFinca: number;

  @ApiProperty() @IsInt() @Min(1)
  idProducto: number;

  @ApiProperty({ example: 1.5 }) @IsNumber() @Min(0)
  fulls: number;

  @ApiProperty({ example: 3 }) @IsInt() @Min(0)
  cantidadCajas: number;

  @ApiPropertyOptional({ description: 'Tipo de caja (FB/HB/QB/EB) si todas las cajas son de un tipo; mezcladas, sin tipo' })
  @IsOptional() @IsInt() @Min(1)
  idTipoCaja?: number;

  @ApiPropertyOptional({ description: 'Si no viene: fulls × cajas por full × kg por caja (lo mismo que sugiere la oficina)' })
  @IsOptional() @IsNumber() @Min(0)
  pesoKg?: number;

  @ApiPropertyOptional({
    example: '055-2026-40-01810346',
    description: 'Una de sus DAE vigentes para el vuelo (registro de DAEs); si no viene, la que propone el registro',
  })
  @IsOptional()
  @Matches(PATRON_DAE, { message: 'La DAE va con el formato 055-AAAA-40-XXXXXXXX.' })
  dae?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  factura?: string;

  @ApiPropertyOptional({ description: 'Valor en USD' }) @IsOptional() @IsNumber() @Min(0)
  valor?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  tallos?: number;
}

/** Una DAE que registra la finca (vale para un país de destino y un período, normalmente el mes). */
export class DaeFincaDto {
  @ApiProperty() @IsInt() @Min(1)
  idFinca: number;

  @ApiProperty({ example: 'KZ', description: 'Siglas del país de destino' }) @IsString() @Length(2, 3)
  pais: string;

  @ApiProperty({ example: '2026-10-01' }) @IsDateString()
  desde: string;

  @ApiProperty({ example: '2026-10-31' }) @IsDateString()
  hasta: string;

  @ApiProperty({ example: '055-2026-40-01810346' })
  @Matches(PATRON_DAE, { message: 'La DAE va con el formato 055-AAAA-40-XXXXXXXX.' })
  dae: string;
}

/** Alta de un usuario de finca (la oficina; como frmWEBusers del viejo). */
export class CrearUsuarioFincaDto {
  @ApiProperty({ example: 'MYSTIC' })
  @Matches(/^[A-Za-z0-9._-]{3,30}$/, { message: 'El usuario va sin espacios: letras, números, punto o guion (3 a 30).' })
  usuario: string;

  @ApiProperty({ example: 'MYSTIC FLOWERS' }) @IsString() @Length(2, 80)
  nombre: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail({}, { message: 'El correo no es válido.' })
  email?: string;

  @ApiProperty({ type: [Number] }) @IsArray() @ArrayMaxSize(30) @IsInt({ each: true })
  fincas: number[];
}

export class ActualizarUsuarioFincaDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 80)
  nombre?: string;

  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsInt({ each: true })
  fincas?: number[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  activo?: boolean;
}
