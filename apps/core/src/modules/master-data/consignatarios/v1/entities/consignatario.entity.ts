import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===== SUB-MODELS ENTITIES =====

export class ConsignatarioCaeSiceEntity {
    @ApiProperty({ description: 'ID del consignatario' })
    idConsignatario: number;

    @ApiPropertyOptional({ description: 'Nombre del consignee' })
    consigneeNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección del consignee' })
    consigneeDireccion?: string;

    @ApiPropertyOptional({ description: 'Documento del consignee' })
    consigneeDocumento?: string;

    @ApiPropertyOptional({ description: 'Siglas país del consignee' })
    consigneeSiglasPais?: string;

    @ApiPropertyOptional({ description: 'Tipo de documento del consignee' })
    consigneeTipoDocumento?: string;

    @ApiPropertyOptional({ description: 'Nombre del notify' })
    notifyNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección del notify' })
    notifyDireccion?: string;

    @ApiPropertyOptional({ description: 'Documento del notify' })
    notifyDocumento?: string;

    @ApiPropertyOptional({ description: 'Siglas país del notify' })
    notifySiglasPais?: string;

    @ApiPropertyOptional({ description: 'Tipo de documento del notify' })
    notifyTipoDocumento?: string;

    @ApiPropertyOptional({ description: 'Nombre del HAWB' })
    hawbNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección del HAWB' })
    hawbDireccion?: string;

    @ApiPropertyOptional({ description: 'Documento del HAWB' })
    hawbDocumento?: string;

    @ApiPropertyOptional({ description: 'Siglas país del HAWB' })
    hawbSiglasPais?: string;

    @ApiPropertyOptional({ description: 'Tipo de documento del HAWB' })
    hawbTipoDocumento?: string;
}

export class ConsignatarioFacturacionEntity {
    @ApiProperty({ description: 'ID del consignatario' })
    idConsignatario: number;

    @ApiPropertyOptional({ description: 'Nombre para facturación' })
    facturaNombre?: string;

    @ApiPropertyOptional({ description: 'RUC para facturación' })
    facturaRuc?: string;

    @ApiPropertyOptional({ description: 'Dirección para facturación' })
    facturaDireccion?: string;

    @ApiPropertyOptional({ description: 'Teléfono para facturación' })
    facturaTelefono?: string;
}

export class ConsignatarioFitoEntity {
    @ApiProperty({ description: 'ID del consignatario' })
    idConsignatario: number;

    @ApiPropertyOptional({ description: 'Nombre declarado FITO' })
    fitoDeclaredName?: string;

    @ApiPropertyOptional({ description: 'Forma A FITO' })
    fitoFormaA?: string;

    @ApiPropertyOptional({ description: 'Nombre FITO' })
    fitoNombre?: string;

    @ApiPropertyOptional({ description: 'Dirección FITO' })
    fitoDireccion?: string;

    @ApiPropertyOptional({ description: 'País FITO' })
    fitoPais?: string;
}

export class ConsignatarioGuiaHEntity {
    @ApiProperty({ description: 'ID del consignatario' })
    idConsignatario: number;

    @ApiPropertyOptional({ description: 'Consignee Guía H' })
    guiaHConsignee?: string;

    @ApiPropertyOptional({ description: 'Nombre y dirección Guía H' })
    guiaHNameAdress?: string;

    @ApiPropertyOptional({ description: 'Notify Guía H' })
    guiaHNotify?: string;
}

export class ConsignatarioGuiaMEntity {
    @ApiProperty({ description: 'ID del consignatario' })
    idConsignatario: number;

    @ApiPropertyOptional({ description: 'ID del destino' })
    idDestino?: number;

    @ApiPropertyOptional({ description: 'Consignee Guía M' })
    guiaMConsignee?: string;

    @ApiPropertyOptional({ description: 'Nombre y dirección Guía M' })
    guiaMNameAddress?: string;

    @ApiPropertyOptional({ description: 'Notify Guía M' })
    guiaMNotify?: string;
}

export class ConsignatarioTransmisionEntity {
    @ApiProperty({ description: 'ID del consignatario' })
    idConsignatario: number;

    @ApiPropertyOptional({ description: 'Nombre consignee transmisión' })
    consigneeNombreTrans?: string;

    @ApiPropertyOptional({ description: 'Dirección consignee transmisión' })
    consigneeDireccionTrans?: string;

    @ApiPropertyOptional({ description: 'Ciudad consignee transmisión' })
    consigneeCiudadTrans?: string;

    @ApiPropertyOptional({ description: 'Provincia consignee transmisión' })
    consigneeProvinciaTrans?: string;

    @ApiPropertyOptional({ description: 'País consignee transmisión' })
    consigneePaisTrans?: string;

    @ApiPropertyOptional({ description: 'EUEORI consignee transmisión' })
    consigneeEueoriTrans?: string;

    @ApiPropertyOptional({ description: 'Nombre notify transmisión' })
    notifyNombreTrans?: string;

    @ApiPropertyOptional({ description: 'Dirección notify transmisión' })
    notifyDireccionTrans?: string;

    @ApiPropertyOptional({ description: 'Ciudad notify transmisión' })
    notifyCiudadTrans?: string;

    @ApiPropertyOptional({ description: 'Provincia notify transmisión' })
    notifyProvinciaTrans?: string;

    @ApiPropertyOptional({ description: 'País notify transmisión' })
    notifyPaisTrans?: string;

    @ApiPropertyOptional({ description: 'EUEORI notify transmisión' })
    notifyEueoriTrans?: string;

    @ApiPropertyOptional({ description: 'Nombre HAWB transmisión' })
    hawbNombreTrans?: string;

    @ApiPropertyOptional({ description: 'Dirección HAWB transmisión' })
    hawbDireccionTrans?: string;

    @ApiPropertyOptional({ description: 'Ciudad HAWB transmisión' })
    hawbCiudadTrans?: string;

    @ApiPropertyOptional({ description: 'Provincia HAWB transmisión' })
    hawbProvinciaTrans?: string;

    @ApiPropertyOptional({ description: 'País HAWB transmisión' })
    hawbPaisTrans?: string;

    @ApiPropertyOptional({ description: 'EUEORI HAWB transmisión' })
    hawbEueoriTrans?: string;
}

// ===== CONSIGNATARIO PRINCIPAL ENTITY =====
export class ConsignatarioEntity {
    @ApiProperty({ description: 'ID del consignatario', example: 1 })
    id: number;

    @ApiProperty({ description: 'Nombre del consignatario' })
    nombre: string;

    @ApiPropertyOptional({ description: 'RUC del consignatario' })
    ruc?: string;

    @ApiPropertyOptional({ description: 'Dirección del consignatario' })
    direccion?: string;

    @ApiProperty({ description: 'ID del embarcador' })
    idEmbarcador: number;

    @ApiProperty({ description: 'ID del cliente' })
    idCliente: number;

    @ApiPropertyOptional({ description: 'Teléfono del consignatario' })
    telefono?: string;

    @ApiPropertyOptional({ description: 'Email del consignatario' })
    email?: string;

    @ApiPropertyOptional({ description: 'Ciudad del consignatario' })
    ciudad?: string;

    @ApiPropertyOptional({ description: 'País del consignatario' })
    pais?: string;

    @ApiProperty({ description: 'Estado del consignatario' })
    estado: boolean;

    @ApiProperty({ description: 'Fecha de creación' })
    createdAt: Date;

    @ApiProperty({ description: 'Fecha de actualización' })
    updatedAt: Date;

    // Relaciones
    @ApiPropertyOptional({ description: 'Datos CAE SICE' })
    caeSice?: ConsignatarioCaeSiceEntity;

    @ApiPropertyOptional({ description: 'Datos de facturación' })
    facturacion?: ConsignatarioFacturacionEntity;

    @ApiPropertyOptional({ description: 'Datos FITO' })
    fito?: ConsignatarioFitoEntity;

    @ApiPropertyOptional({ description: 'Datos Guía H' })
    guiaH?: ConsignatarioGuiaHEntity;

    @ApiPropertyOptional({ description: 'Datos Guía M' })
    guiaM?: ConsignatarioGuiaMEntity;

    @ApiPropertyOptional({ description: 'Datos de transmisión' })
    transmision?: ConsignatarioTransmisionEntity;
}