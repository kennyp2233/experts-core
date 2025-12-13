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

    @IsString()
    nombreMarca: string;

    @IsString()
    nombreConsignatario: string;

    @IsString()
    direccionConsignatario: string;

    @IsOptional()
    @IsString()
    informacionAdicional?: string;
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

export class GuiaHijaAgregadaDto {
    @IsString()
    plaRUC: string;

    @IsString()
    plaNombre: string;

    @IsString()
    proCodigo: string;

    @IsString()
    codigoAgrocalidad: string;

    @IsNumber()
    detCajas: number;

    @IsNumber()
    detNumStems: number;
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

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GuiaHijaAgregadaDto)
    guiasHijas: GuiaHijaAgregadaDto[];
}
