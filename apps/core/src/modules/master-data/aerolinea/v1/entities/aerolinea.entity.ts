import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Aerolinea,
    AerolineaRuta,
    AerolineasPlantilla,
    ModoAerolinea,
} from '.prisma/productos-client';
import { AerolineaPlantillaEntity } from './aerolinea-plantilla.entity';
import { AerolineaRutaEntity } from './aerolinea-ruta.entity';

export class AerolineaEntity implements Aerolinea {
    @ApiProperty({
        description: 'ID único de la aerolínea',
        example: 1,
    })
    id: number;

    @ApiProperty({
        description: 'Nombre de la aerolínea',
        example: 'Avianca',
    })
    nombre: string;

    @ApiPropertyOptional({
        description: 'CI/RUC de la aerolínea',
        example: '0991234567001',
    })
    ciRuc: string | null;

    @ApiPropertyOptional({
        description: 'Dirección de la aerolínea',
        example: 'Av. Amazonas N32-45',
    })
    direccion: string | null;

    @ApiPropertyOptional({
        description: 'Teléfono de contacto',
        example: '+593 2 123 4567',
    })
    telefono: string | null;

    @ApiPropertyOptional({
        description: 'Correo electrónico',
        example: 'contacto@aerolinea.com',
    })
    email: string | null;

    @ApiPropertyOptional({
        description: 'Ciudad de la aerolínea',
        example: 'Quito',
    })
    ciudad: string | null;

    @ApiPropertyOptional({
        description: 'País de la aerolínea',
        example: 'Ecuador',
    })
    pais: string | null;

    @ApiPropertyOptional({
        description: 'Persona de contacto',
        example: 'Juan Pérez',
    })
    contacto: string | null;

    @ApiPropertyOptional({
        description: 'Modo de operación',
        enum: ModoAerolinea,
        example: ModoAerolinea.EN_PIEZAS,
    })
    modo: ModoAerolinea | null;

    @ApiPropertyOptional({
        description: 'Indica si es maestra de guías hijas',
        example: false,
    })
    maestraGuiasHijas: boolean | null;

    @ApiPropertyOptional({
        description: 'Código de la aerolínea',
        example: 'AV',
    })
    codigo: string | null;

    @ApiPropertyOptional({
        description: 'Prefijo AWB',
        example: '134',
    })
    prefijoAwb: string | null;

    @ApiPropertyOptional({
        description: 'Código CAE',
        example: 'CAE001',
    })
    codigoCae: string | null;

    @ApiPropertyOptional({
        description: 'Estado activo de la aerolínea',
        example: true,
    })
    estado: boolean | null;

    @ApiPropertyOptional({
        description: 'Afiliado a CASS',
        example: false,
    })
    afiliadoCass: boolean | null;

    @ApiPropertyOptional({
        description: 'Utiliza guías virtuales',
        example: true,
    })
    guiasVirtuales: boolean | null;

    @ApiProperty({
        description: 'Fecha de creación',
        example: '2023-01-01T00:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Fecha de actualización',
        example: '2023-01-01T00:00:00.000Z',
    })
    updatedAt: Date;

    // Relations
    @ApiPropertyOptional({
        description: 'Plantilla de la aerolínea',
        type: () => AerolineaPlantillaEntity,
    })
    aerolineasPlantilla?: AerolineaPlantillaEntity | null;

    @ApiPropertyOptional({
        description: 'Rutas de la aerolínea',
        type: [AerolineaRutaEntity],
    })
    rutas?: AerolineaRutaEntity[];

    @ApiPropertyOptional({
        description: 'Rutas donde esta aerolínea es vía',
        type: [AerolineaRutaEntity],
    })
    viasAerolineas?: AerolineaRutaEntity[];
}