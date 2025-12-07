import { IsOptional, IsBoolean, IsString, IsDateString } from 'class-validator';

export class UpdateGuiaMadreDto {
    @IsOptional()
    @IsBoolean()
    prestamo?: boolean;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsDateString()
    fechaPrestamo?: string;

    @IsOptional()
    @IsBoolean()
    devolucion?: boolean;

    @IsOptional()
    @IsDateString()
    fechaDevolucion?: string;
}
