export interface GuiaData {
    docNumero: number;
    docFecha: string;
    docRefer?: string;
    docNota?: string;
    docDestino?: string;
    embCodigo?: string;
    bodCodigo?: number;
    docTipo?: string;
}

export interface GuiaMadre {
    bodCodigo: number;
    docTipo: string;
    docNumero: number;
    docNumGuia: string;  // The AWB/guide number users see
    marCodigo: number;
    docFecha: string;
    docDestino?: string;
    consignatarioNombre?: string;
    consignatarioDireccion?: string;
}

export interface MarcaData {
    marCodigo: number;
    marNombre: string;
    marDireccion?: string;
    marPaisSigla?: string;
    marFITO?: string;
    marRUC?: string;
}

export interface DetalleGuia {
    docNumero: number;
    detNumero: number;
    marCodigo: number;
    plaCodigo: number;
    proCodigo: string;
    detNumStems: number;
    detCajas: number;
    detFecha?: string;

    // Joined fields
    marNombre?: string;
    marDireccion?: string;
    marPaisSigla?: string;
    marFITO?: string;

    plaRUC?: string;
    plaNombre?: string;
}

export interface GuiaCompleta {
    guia: GuiaData;
    detalles: DetalleGuia[];
    consignatario: {
        nombre: string;
        direccion: string;
        fito: string;
        paisSigla: string;
    };
}

