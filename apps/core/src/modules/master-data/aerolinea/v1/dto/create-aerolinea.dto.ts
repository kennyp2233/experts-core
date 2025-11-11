import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ModoAerolinea } from '.prisma/productos-client';
import { CreateAerolineaRutaDto } from './aerolinea-ruta.dto';
import { CreateAerolineaPlantillaDto } from './aerolinea-plantilla.dto';

export class CreateAerolineaDto {
    @ApiProperty({
        description: 'Nombre de la aerolínea',
        example: 'Avianca',
    })
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @ApiPropertyOptional({
        description: 'CI/RUC de la aerolínea',
        example: '0991234567001',
    })
    @IsOptional()
    @IsString()
    ciRuc?: string;

    @ApiPropertyOptional({
        description: 'Dirección de la aerolínea',
        example: 'Av. Amazonas N32-45',
    })
    @IsOptional()
    @IsString()
    direccion?: string;

    @ApiPropertyOptional({
        description: 'Teléfono de contacto',
        example: '+593 2 123 4567',
    })
    @IsOptional()
    @IsString()
    telefono?: string;

    @ApiPropertyOptional({
        description: 'Correo electrónico',
        example: 'contacto@aerolinea.com',
    })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({
        description: 'Ciudad de la aerolínea',
        example: 'Quito',
    })
    @IsOptional()
    @IsString()
    ciudad?: string;

    @ApiPropertyOptional({
        description: 'País de la aerolínea',
        example: 'Ecuador',
    })
    @IsOptional()
    @IsString()
    pais?: string;

    @ApiPropertyOptional({
        description: 'Persona de contacto',
        example: 'Juan Pérez',
    })
    @IsOptional()
    @IsString()
    contacto?: string;

    @ApiPropertyOptional({
        description: 'Modo de operación',
        enum: ModoAerolinea,
        example: ModoAerolinea.EN_PIEZAS,
    })
    @IsOptional()
    @IsEnum(ModoAerolinea)
    modo?: ModoAerolinea;

    @ApiPropertyOptional({
        description: 'Indica si es maestra de guías hijas',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    maestraGuiasHijas?: boolean;

    @ApiPropertyOptional({
        description: 'Código de la aerolínea',
        example: 'AV',
    })
    @IsOptional()
    @IsString()
    codigo?: string;

    @ApiPropertyOptional({
        description: 'Prefijo AWB',
        example: '134',
    })
    @IsOptional()
    @IsString()
    prefijoAwb?: string;

    @ApiPropertyOptional({
        description: 'Código CAE',
        example: 'CAE001',
    })
    @IsOptional()
    @IsString()
    codigoCae?: string;

    @ApiPropertyOptional({
        description: 'Estado activo de la aerolínea',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    estado?: boolean;

    @ApiPropertyOptional({
        description: 'Afiliado a CASS',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    afiliadoCass?: boolean;

    @ApiPropertyOptional({
        description: 'Utiliza guías virtuales',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    guiasVirtuales?: boolean;

    @ApiPropertyOptional({
        description: 'Rutas de la aerolínea',
        type: [CreateAerolineaRutaDto],
        example: [
            {
                origenId: 1,
                destinoId: 2,
                orden: 1,
                tipoRuta: 'DIRECTA'
            }
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAerolineaRutaDto)
    rutas?: CreateAerolineaRutaDto[];

    @ApiPropertyOptional({
        description: 'Plantilla de la aerolínea con conceptos de costo',
        type: CreateAerolineaPlantillaDto,
        example: {
            plantillaGuiaMadre: 'PLANTILLA_001',
            plantillaFormatoAerolinea: 'FORMATO_AV',
            plantillaReservas: 'RESERVAS_AV',
            tarifaRate: 150.50,
            pca: 25.00,
            conceptos: [
                {
                    tipo: 'COSTO_GUIA',
                    abreviatura: 'CG',
                    valor: 100.00,
                    multiplicador: 'GROSS_WEIGHT'
                }
            ]
        },
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAerolineaPlantillaDto)
    plantilla?: CreateAerolineaPlantillaDto;
}

export class UpdateAerolineaDto {
    @ApiPropertyOptional({
        description: 'Nombre de la aerolínea',
        example: 'Avianca',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    nombre?: string;

    @ApiPropertyOptional({
        description: 'CI/RUC de la aerolínea',
        example: '0991234567001',
    })
    @IsOptional()
    @IsString()
    ciRuc?: string;

    @ApiPropertyOptional({
        description: 'Dirección de la aerolínea',
        example: 'Av. Amazonas N32-45',
    })
    @IsOptional()
    @IsString()
    direccion?: string;

    @ApiPropertyOptional({
        description: 'Teléfono de contacto',
        example: '+593 2 123 4567',
    })
    @IsOptional()
    @IsString()
    telefono?: string;

    @ApiPropertyOptional({
        description: 'Correo electrónico',
        example: 'contacto@aerolinea.com',
    })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({
        description: 'Ciudad de la aerolínea',
        example: 'Quito',
    })
    @IsOptional()
    @IsString()
    ciudad?: string;

    @ApiPropertyOptional({
        description: 'País de la aerolínea',
        example: 'Ecuador',
    })
    @IsOptional()
    @IsString()
    pais?: string;

    @ApiPropertyOptional({
        description: 'Persona de contacto',
        example: 'Juan Pérez',
    })
    @IsOptional()
    @IsString()
    contacto?: string;

    @ApiPropertyOptional({
        description: 'Modo de operación',
        enum: ModoAerolinea,
        example: ModoAerolinea.EN_PIEZAS,
    })
    @IsOptional()
    @IsEnum(ModoAerolinea)
    modo?: ModoAerolinea;

    @ApiPropertyOptional({
        description: 'Indica si es maestra de guías hijas',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    maestraGuiasHijas?: boolean;

    @ApiPropertyOptional({
        description: 'Código de la aerolínea',
        example: 'AV',
    })
    @IsOptional()
    @IsString()
    codigo?: string;

    @ApiPropertyOptional({
        description: 'Prefijo AWB',
        example: '134',
    })
    @IsOptional()
    @IsString()
    prefijoAwb?: string;

    @ApiPropertyOptional({
        description: 'Código CAE',
        example: 'CAE001',
    })
    @IsOptional()
    @IsString()
    codigoCae?: string;

    @ApiPropertyOptional({
        description: 'Estado activo de la aerolínea',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    estado?: boolean;

    @ApiPropertyOptional({
        description: 'Afiliado a CASS',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    afiliadoCass?: boolean;

    @ApiPropertyOptional({
        description: 'Utiliza guías virtuales',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    guiasVirtuales?: boolean;

    @ApiPropertyOptional({
        description: 'Rutas de la aerolínea (solo para creación, no para actualización)',
        type: [CreateAerolineaRutaDto],
        example: [
            {
                origenId: 1,
                destinoId: 2,
                orden: 1,
                tipoRuta: 'DIRECTA'
            }
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAerolineaRutaDto)
    rutas?: CreateAerolineaRutaDto[];

    @ApiPropertyOptional({
        description: 'Plantilla de la aerolínea (solo para creación, no para actualización)',
        type: CreateAerolineaPlantillaDto,
        example: {
            plantillaGuiaMadre: 'PLANTILLA_001',
            plantillaFormatoAerolinea: 'FORMATO_AV',
            plantillaReservas: 'RESERVAS_AV',
            tarifaRate: 150.50,
            pca: 25.00,
            conceptos: [
                {
                    tipo: 'COSTO_GUIA',
                    abreviatura: 'CG',
                    valor: 100.00,
                    multiplicador: 'GROSS_WEIGHT'
                }
            ]
        },
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAerolineaPlantillaDto)
    plantilla?: CreateAerolineaPlantillaDto;
}