import { IsArray, IsInt, IsOptional, IsString, ValidateNested, IsObject, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FitoXmlConfigDto {
    @IsString()
    tipoSolicitud: string;

    @IsString()
    codigoIdioma: string;

    @IsString()
    codigoTipoProduccion: string;

    @IsString()
    fechaEmbarque: string;

    @IsString()
    codigoPuertoEc: string;

    @IsString()
    codigoPuertoDestino: string;

    @IsOptional()
    @IsString()
    nombreMarca?: string;

    @IsOptional()
    @IsString()
    nombreConsignatario?: string;

    @IsOptional()
    @IsString()
    direccionConsignatario?: string;
}

export class ProductMappingDto {
    @IsString()
    originalCode: string;

    @IsString()
    codigoAgrocalidad: string;

    @IsString()
    nombreComun: string;

    @IsBoolean()
    matched: boolean;

    @IsNumber()
    confidence: number;
}

export class GenerateXmlDto {
    @IsArray()
    @IsInt({ each: true })
    guias: number[];

    @IsObject()
    @ValidateNested()
    @Type(() => FitoXmlConfigDto)
    config: FitoXmlConfigDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductMappingDto)
    productMappings: ProductMappingDto[];
}
