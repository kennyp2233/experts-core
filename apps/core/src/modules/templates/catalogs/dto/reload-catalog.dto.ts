import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReloadCatalogDto {
    @IsEnum(['productos', 'puertos_ecuador', 'puertos_internacional', 'all'])
    catalog: string;

    @IsOptional()
    @IsString()
    customFilePath?: string;  // Para testing
}
