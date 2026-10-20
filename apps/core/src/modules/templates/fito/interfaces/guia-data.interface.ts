export interface GuiaData {
    docNumero: number;
    /** N° de coordinación que ve la oficina (sistema nuevo; en Access es el docNumero). */
    numero?: number | null;
    docFecha: string;
    docRefer?: string;
    docNota?: string;
    docDestino?: string;
    embCodigo?: string;
    bodCodigo?: number;
    docTipo?: string;
}

/** De dónde se leen las guías para el FITO: el sistema nuevo (Postgres) o, deprecado, Access directo. */
export type FuenteFito = 'sistema' | 'access';

export interface GuiaMadre {
    bodCodigo: number;
    docTipo: string;
    /** Access: PIN_MCoordina.docNumero. Sistema nuevo: id de la coordinación. */
    docNumero: number;
    /** N° de coordinación que ve la oficina (solo sistema nuevo). */
    numero?: number | null;
    docNumGuia: string;  // The AWB/guide number users see
    marCodigo: number;
    /** Access: fecha del documento (asignación). Sistema nuevo: fecha de vuelo. */
    docFecha: string;
    /** Fecha de vuelo (Access: PIN_dDocExtra.extFechaDespacho). Es la que va al FITO. */
    docFechaVuelo?: string;
    docDestino?: string;
    docFITODestino?: string;
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
    /** Sistema nuevo: la línea no tenía tallos y se calcularon (fulls × tallos por full). */
    stemsSugeridos?: boolean;
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
