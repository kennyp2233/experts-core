import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchProductoDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsOptional()
    @IsBoolean()
    fuzzy?: boolean;  // Habilitar búsqueda fuzzy
}
