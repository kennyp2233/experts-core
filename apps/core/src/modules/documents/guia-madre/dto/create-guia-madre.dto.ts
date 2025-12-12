import { IsNotEmpty, IsInt, Min, IsOptional, IsBoolean, IsDateString, IsString, IsEnum } from 'class-validator';
import { TipoStock } from '@internal/documentos-client';

export class CreateGuiaMadreDto {
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    prefijo: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    secuencialInicial: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    cantidad: number;

    @IsNotEmpty()
    @IsInt()
    idAerolinea: number;

    @IsOptional()
    @IsInt()
    idAgenciaIata?: number;

    @IsOptional()
    @IsDateString()
    fecha?: string;

    @IsOptional()
    @IsEnum(TipoStock)
    tipoStock?: TipoStock;

    @IsOptional()
    @IsBoolean()
    prestamo?: boolean;

    @IsOptional()
    @IsString()
    observaciones?: string;
}
