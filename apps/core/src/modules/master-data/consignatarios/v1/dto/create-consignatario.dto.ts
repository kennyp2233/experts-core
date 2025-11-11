import { IsString, IsOptional, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ===== SUB-MODELS DTOs =====

export class CreateConsignatarioCaeSiceDto {
    @ApiPropertyOptional({ description: 'Nombre del consignee' })
    @IsOptional()
    @IsString()
    consigneeNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección del consignee' })
    @IsOptional()
    @IsString()
    consigneeDireccion?: string;

    @ApiPropertyOptional({ description: 'Documento del consignee' })
    @IsOptional()
    @IsString()
    consigneeDocumento?: string;

    @ApiPropertyOptional({ description: 'Siglas país del consignee' })
    @IsOptional()
    @IsString()
    consigneeSiglasPais?: string;

    @ApiPropertyOptional({ description: 'Tipo de documento del consignee' })
    @IsOptional()
    @IsString()
    consigneeTipoDocumento?: string;

    @ApiPropertyOptional({ description: 'Nombre del notify' })
    @IsOptional()
    @IsString()
    notifyNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección del notify' })
    @IsOptional()
    @IsString()
    notifyDireccion?: string;

    @ApiPropertyOptional({ description: 'Documento del notify' })
    @IsOptional()
    @IsString()
    notifyDocumento?: string;

    @ApiPropertyOptional({ description: 'Siglas país del notify' })
    @IsOptional()
    @IsString()
    notifySiglasPais?: string;

    @ApiPropertyOptional({ description: 'Tipo de documento del notify' })
    @IsOptional()
    @IsString()
    notifyTipoDocumento?: string;

    @ApiPropertyOptional({ description: 'Nombre del HAWB' })
    @IsOptional()
    @IsString()
    hawbNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección del HAWB' })
    @IsOptional()
    @IsString()
    hawbDireccion?: string;

    @ApiPropertyOptional({ description: 'Documento del HAWB' })
    @IsOptional()
    @IsString()
    hawbDocumento?: string;

    @ApiPropertyOptional({ description: 'Siglas país del HAWB' })
    @IsOptional()
    @IsString()
    hawbSiglasPais?: string;

    @ApiPropertyOptional({ description: 'Tipo de documento del HAWB' })
    @IsOptional()
    @IsString()
    hawbTipoDocumento?: string;
}

export class CreateConsignatarioFacturacionDto {
    @ApiPropertyOptional({ description: 'Nombre para facturación' })
    @IsOptional()
    @IsString()
    facturaNombre?: string;

    @ApiPropertyOptional({ description: 'RUC para facturación' })
    @IsOptional()
    @IsString()
    facturaRuc?: string;

    @ApiPropertyOptional({ description: 'Dirección para facturación' })
    @IsOptional()
    @IsString()
    facturaDireccion?: string;

    @ApiPropertyOptional({ description: 'Teléfono para facturación' })
    @IsOptional()
    @IsString()
    facturaTelefono?: string;
}

export class CreateConsignatarioFitoDto {
    @ApiPropertyOptional({ description: 'Nombre declarado FITO' })
    @IsOptional()
    @IsString()
    fitoDeclaredName?: string;

    @ApiPropertyOptional({ description: 'Forma A FITO' })
    @IsOptional()
    @IsString()
    fitoFormaA?: string;

    @ApiPropertyOptional({ description: 'Nombre FITO' })
    @IsOptional()
    @IsString()
    fitoNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección FITO' })
    @IsOptional()
    @IsString()
    fitoDireccion?: string;

    @ApiPropertyOptional({ description: 'País FITO' })
    @IsOptional()
    @IsString()
    fitoPais?: string;
}

export class CreateConsignatarioGuiaHDto {
    @ApiPropertyOptional({ description: 'Consignee Guía H' })
    @IsOptional()
    @IsString()
    guiaHConsignee?: string;

    @ApiPropertyOptional({ description: 'Nombre y dirección Guía H' })
    @IsOptional()
    @IsString()
    guiaHNameAdress?: string;

    @ApiPropertyOptional({ description: 'Notify Guía H' })
    @IsOptional()
    @IsString()
    guiaHNotify?: string;
}

export class CreateConsignatarioGuiaMDto {
    @ApiPropertyOptional({ description: 'ID del destino' })
    @IsOptional()
    @IsNumber()
    idDestino?: number;

    @ApiPropertyOptional({ description: 'Consignee Guía M' })
    @IsOptional()
    @IsString()
    guiaMConsignee?: string;

    @ApiPropertyOptional({ description: 'Nombre y dirección Guía M' })
    @IsOptional()
    @IsString()
    guiaMNameAddress?: string;

    @ApiPropertyOptional({ description: 'Notify Guía M' })
    @IsOptional()
    @IsString()
    guiaMNotify?: string;
}

export class CreateConsignatarioTransmisionDto {
    @ApiPropertyOptional({ description: 'Nombre consignee transmisión' })
    @IsOptional()
    @IsString()
    consigneeNombreTrans?: string;

    @ApiPropertyOptional({ description: 'Dirección consignee transmisión' })
    @IsOptional()
    @IsString()
    consigneeDireccionTrans?: string;

    @ApiPropertyOptional({ description: 'Ciudad consignee transmisión' })
    @IsOptional()
    @IsString()
    consigneeCiudadTrans?: string;

    @ApiPropertyOptional({ description: 'Provincia consignee transmisión' })
    @IsOptional()
    @IsString()
    consigneeProvinciaTrans?: string;

    @ApiPropertyOptional({ description: 'País consignee transmisión' })
    @IsOptional()
    @IsString()
    consigneePaisTrans?: string;

    @ApiPropertyOptional({ description: 'EUEORI consignee transmisión' })
    @IsOptional()
    @IsString()
    consigneeEueoriTrans?: string;

    @ApiPropertyOptional({ description: 'Nombre notify transmisión' })
    @IsOptional()
    @IsString()
    notifyNombreTrans?: string;

    @ApiPropertyOptional({ description: 'Dirección notify transmisión' })
    @IsOptional()
    @IsString()
    notifyDireccionTrans?: string;

    @ApiPropertyOptional({ description: 'Ciudad notify transmisión' })
    @IsOptional()
    @IsString()
    notifyCiudadTrans?: string;

    @ApiPropertyOptional({ description: 'Provincia notify transmisión' })
    @IsOptional()
    @IsString()
    notifyProvinciaTrans?: string;

    @ApiPropertyOptional({ description: 'País notify transmisión' })
    @IsOptional()
    @IsString()
    notifyPaisTrans?: string;

    @ApiPropertyOptional({ description: 'EUEORI notify transmisión' })
    @IsOptional()
    @IsString()
    notifyEueoriTrans?: string;

    @ApiPropertyOptional({ description: 'Nombre HAWB transmisión' })
    @IsOptional()
    @IsString()
    hawbNombreTrans?: string;

    @ApiPropertyOptional({ description: 'Dirección HAWB transmisión' })
    @IsOptional()
    @IsString()
    hawbDireccionTrans?: string;

    @ApiPropertyOptional({ description: 'Ciudad HAWB transmisión' })
    @IsOptional()
    @IsString()
    hawbCiudadTrans?: string;

    @ApiPropertyOptional({ description: 'Provincia HAWB transmisión' })
    @IsOptional()
    @IsString()
    hawbProvinciaTrans?: string;

    @ApiPropertyOptional({ description: 'País HAWB transmisión' })
    @IsOptional()
    @IsString()
    hawbPaisTrans?: string;

    @ApiPropertyOptional({ description: 'EUEORI HAWB transmisión' })
    @IsOptional()
    @IsString()
    hawbEueoriTrans?: string;
}

// ===== CONSIGNATARIO PRINCIPAL DTO =====
export class CreateConsignatarioDto {
    @ApiProperty({
        description: 'Nombre del consignatario',
        example: 'Consignatario ABC',
    })
    @IsString()
    nombre: string;

    @ApiPropertyOptional({
        description: 'RUC del consignatario',
        example: '1234567890001',
    })
    @IsOptional()
    @IsString()
    ruc?: string;

    @ApiPropertyOptional({
        description: 'Dirección del consignatario',
        example: 'Av. Principal 123',
    })
    @IsOptional()
    @IsString()
    direccion?: string;

    @ApiProperty({
        description: 'ID del embarcador',
        example: 1,
    })
    @IsNumber()
    idEmbarcador: number;

    @ApiProperty({
        description: 'ID del cliente',
        example: 1,
    })
    @IsNumber()
    idCliente: number;

    @ApiPropertyOptional({
        description: 'Teléfono del consignatario',
        example: '+593987654321',
    })
    @IsOptional()
    @IsString()
    telefono?: string;

    @ApiPropertyOptional({
        description: 'Email del consignatario',
        example: 'contacto@consignatario.com',
    })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({
        description: 'Ciudad del consignatario',
        example: 'Quito',
    })
    @IsOptional()
    @IsString()
    ciudad?: string;

    @ApiPropertyOptional({
        description: 'País del consignatario',
        example: 'Ecuador',
    })
    @IsOptional()
    @IsString()
    pais?: string;

    @ApiPropertyOptional({
        description: 'Estado del consignatario',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    estado?: boolean;

    // ===== DATOS CAE SICE =====
    @ApiPropertyOptional({
        description: 'Datos CAE SICE del consignatario',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateConsignatarioCaeSiceDto)
    caeSice?: CreateConsignatarioCaeSiceDto;

    // ===== DATOS FACTURACIÓN =====
    @ApiPropertyOptional({
        description: 'Datos de facturación del consignatario',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateConsignatarioFacturacionDto)
    facturacion?: CreateConsignatarioFacturacionDto;

    // ===== DATOS FITO =====
    @ApiPropertyOptional({
        description: 'Datos FITO del consignatario',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateConsignatarioFitoDto)
    fito?: CreateConsignatarioFitoDto;

    // ===== DATOS GUÍA H =====
    @ApiPropertyOptional({
        description: 'Datos Guía H del consignatario',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateConsignatarioGuiaHDto)
    guiaH?: CreateConsignatarioGuiaHDto;

    // ===== DATOS GUÍA M =====
    @ApiPropertyOptional({
        description: 'Datos Guía M del consignatario',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateConsignatarioGuiaMDto)
    guiaM?: CreateConsignatarioGuiaMDto;

    // ===== DATOS TRANSMISIÓN =====
    @ApiPropertyOptional({
        description: 'Datos de transmisión del consignatario',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateConsignatarioTransmisionDto)
    transmision?: CreateConsignatarioTransmisionDto;
}