import type { AccionEbf, EstadoLineaEbf } from './conciliacion-ebf';

/**
 * `EBF_ENVIO_MODO`:
 * - comparar (default): lee EBF, concilia y muestra; nunca escribe.
 * - manual: escribe cuando alguien presiona "Enviar a EBF" (dentro del horario).
 * - automatico: además, el ciclo envía lo pendiente al abrir EBF y mientras está abierto.
 */
export type ModoEnvioEbf = 'comparar' | 'manual' | 'automatico';

export const modoEnvioEbf = (): ModoEnvioEbf => {
  const m = (process.env.EBF_ENVIO_MODO || 'comparar').toLowerCase();
  return m === 'manual' || m === 'automatico' ? m : 'comparar';
};

export interface VentanaEbf {
  abierta: boolean;
  /** ISO; ahora si está abierta */
  proximaApertura: string;
  /** "Lun/Mar/Mié/Jue/Vie 08:00–13:30; Sáb 08:00–12:00" */
  horario: string;
  /** Día (Ecuador) en que se enviaría lo pendiente */
  diaEnvio: string;
}

export interface LineaEstadoEbf {
  id: number | null;
  clave: string;
  estado: EstadoLineaEbf;
  accion: AccionEbf | null;
  motivo: string;
  ultimoError: string | null;
  enviadaEn: string | null;
  // Lo de la coordinación (null en SOLO_EN_EBF)
  idFinca: number | null;
  idProducto: number | null;
  idConsignatario: number | null;
  /** Enlaces con EBF que faltan para esta línea */
  faltan: Array<'FINCA' | 'MARCA' | 'PRODUCTO'>;
  finca: string | null;
  producto: string | null;
  marca: string | null;
  numeroGuiaHija: string | null;
  dae: string | null;
  fulls: number;
  cajas: number;
  /** "2 HB + 1 QB" */
  cajasPorTipo: string | null;
  // Lo que EBF tiene
  ebf: {
    exportador: string;
    producto: string;
    marcacion: string;
    dae: string | null;
    fulls: number;
    cajas: number;
    fullsBodega: number;
    cajasBodega: number;
    hawb: string | null;
    filas: number;
    coordinadaPor: string | null;
    diaCoordinacion: string | null;
  } | null;
}

export interface ResumenEbf {
  lineas: number;
  enEbf: number;
  porEnviar: number;
  pedirAEbf: number;
  faltaEnlace: number;
  soloEnEbf: number;
  errores: number;
  omitidas: number;
}

export interface EstadoEbfCoordinacion {
  idCoordinacion: number;
  numero: number | null;
  numeroGuia: string | null;
  fechaVuelo: string;
  marca: string | null;
  /** Creada en el sistema nuevo: se envía. Si no, solo se compara (la tipeó la oficina). */
  enviable: boolean;
  /** Se anuló o ya no va con EBF: lo que quede en EBF se borra */
  anulada: boolean;
  modo: ModoEnvioEbf;
  ventana: VentanaEbf;
  ebf: {
    guia: string | null;
    provisional: boolean;
    estado: string | null;
    fulls: number | null;
    cajas: number | null;
    fullsBodega: number | null;
    cajasBodega: number | null;
    pesoBruto: number | null;
    pesoCobrable: number | null;
    leidoEn: string | null;
    errorLectura: string | null;
    avisos: string[];
  };
  resumen: ResumenEbf;
  lineas: LineaEstadoEbf[];
  /** Si se puede enviar ahora y, si no, por qué */
  puedeEnviar: boolean;
  motivoNoEnviar: string | null;
}
