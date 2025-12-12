import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchPuertoDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsEnum(['nacional', 'internacional'])
    tipo: string;

    @IsOptional()
    @IsString()
    pais?: string;  // Requerido si es internacional
}
