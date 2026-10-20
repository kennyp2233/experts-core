import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';

/** Alta de un usuario del portal de clientes (la oficina). */
export class CrearUsuarioClienteDto {
  @ApiProperty({ example: 'KLABUKOVA' })
  @Matches(/^[A-Za-z0-9._-]{3,30}$/, { message: 'El usuario va sin espacios: letras, números, punto o guion (3 a 30).' })
  usuario: string;

  @ApiProperty({ example: 'TAMARA KLABUKOVA' }) @IsString() @Length(2, 80)
  nombre: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail({}, { message: 'El correo no es válido.' })
  email?: string;

  @ApiProperty({ type: [Number], description: 'Clientes (datos maestros) cuyas guías ve' })
  @IsArray() @ArrayMinSize(1, { message: 'Asigne al menos un cliente.' }) @ArrayMaxSize(20) @IsInt({ each: true })
  clientes: number[];
}

export class ActualizarUsuarioClienteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 80)
  nombre?: string;

  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsInt({ each: true })
  clientes?: number[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  activo?: boolean;
}
