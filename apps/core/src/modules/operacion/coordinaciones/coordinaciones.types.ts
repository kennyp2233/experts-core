import type { ResumenLiquidacion } from '../calculos/liquidacion';
import type { RefMaestro } from '../maestros/nombres-maestros.service';

export type EstadoCoordinacion = 'BORRADOR' | 'CORTADO' | 'ANULADO';
/** ACCESS = viene del sistema viejo (sync); SISTEMA = creada en el sistema nuevo. */
export type OrigenDocumento = 'ACCESS' | 'SISTEMA';

export interface CoordinacionResumen {
  id: number;
  codigoAccess: number | null;
  origen: OrigenDocumento;
  numeroGuia: string | null;
  estado: EstadoCoordinacion;
  fechaVuelo: string;
  fechaAsignacion: string;
  aerolinea: RefMaestro | null;
  consignatario: RefMaestro | null;
  /** Cliente de la marca (en el sistema viejo, "Embarcador"/cliAlias). */
  cliente: RefMaestro | null;
  destino: RefMaestro | null;
  destinoFinal: RefMaestro | null;
  totalFulls: number | null;
  totalCajas: number | null;
  totalKgs: number | null;
  guiasHijas: number;
  liqTotal: number | null;
  /** Peso cobrable que da la aerolínea (liquidación normal; "VOL." en la lista vieja). */
  pesoCobrable: number | null;
  corteExtra: boolean;
  /** Manifiesto aduanero, ej. "CEC-2026-5Y-050786-0043". */
  codigoManifiesto: string | null;
  /** Nota de la coordinación (p. ej. el termógrafo). */
  nota: string | null;
}

export interface CoordinacionPagina {
  items: CoordinacionResumen[];
  /** Totales de todo el filtro (no solo de la página), como el pie de la lista vieja. */
  totales: { fulls: number; cajas: number; kgs: number; pesoCobrable: number };
  total: number;
  page: number;
  pageSize: number;
}

export interface LiquidacionDetalle {
  tipo: 'NORMAL' | 'CORTE_EXTRA';
  pesoCobrable: number | null;
  tarifa: number | null;
  guiaAerea: number | null;
  combustible: number | null;
  seguridad: number | null;
  otros: number | null;
  iva: number | null;
  handling: number | null;
  cargoAwa: number | null;
  cargoCha: number | null;
  cargoPca: number | null;
  cargoTax: number | null;
  cargoMma: number | null;
  cargoHawb: number | null;
  cargoFitos: number | null;
  aux1: number | null;
  aux2: number | null;
  aux3Handling: number | null;
  calAux: number | null;
  auxOtros: number | null;
  tarifaAcordada: number | null;
  calculaPca: boolean | null;
  /** Flete, cargos y total de este juego (mismas fórmulas que el corte). */
  resumen: ResumenLiquidacion;
}

export interface TramoRuta {
  orden: number | null;
  tipoRuta: string;
  codigo: string | null;
  vuelo: string | null;
  fechaHoraSalida: string | null;
  fechaHoraLlegada: string | null;
  salidaTipo: string | null;
  llegadaTipo: string | null;
}

export interface LineaGuiaHija {
  id: number;
  numeroLinea: number | null;
  producto: RefMaestro | null;
  codigoProducto: string | null;
  tipoCaja: { id: number; codigo: string | null; nombre: string } | null;
  cantidadCajas: number;
  fulls: number | null;
  pesoKg: number | null;
  tallos: number | null;
  valor: number | null;
  dae: string | null;
  largo: number | null;
  ancho: number | null;
  alto: number | null;
  nota: string | null;
  factura: string | null;
  /** Quién registró la línea: "E" = la finca por la web, "I" = transferencia interna, null = la oficina. */
  origen: string | null;
  usuario: string | null;
  fechaRegistro: string | null;
}

export interface GuiaHijaDetalle {
  id: number;
  numeroGuiaHija: string;
  dae: string | null;
  finca: RefMaestro | null;
  consignatario: RefMaestro | null;
  pesoBruto: number;
  totalPiezas: number;
  totalFulls: number;
  lineas: LineaGuiaHija[];
}

export interface CoordinacionDetalle extends CoordinacionResumen {
  /** Fecha de la última modificación: se manda al grabar para no pisar cambios de otros (una finca que cargó). */
  version: string;
  agencia: RefMaestro | null;
  tipoEmbarque: RefMaestro | null;
  pago: 'PREPAID' | 'COLLECT';
  referencia: string | null;
  nota: string | null;
  totalVolumen: number | null;
  cupoFulls: number | null;
  guiaMadre: {
    id: number;
    numero: string | null;
    estado: string | null;
    virtual: boolean | null;
    lote: { id: number; codigoAccess: number | null; fecha: string | null } | null;
  };
  liquidacion: {
    fulls: number | null;
    piezas: number | null;
    pesoBruto: number | null;
    pesoCobrable: number | null;
    tarifa: number | null;
    flete: number | null;
    dueAgent: number | null;
    dueCarrier: number | null;
    total: number | null;
    comision: number | null;
    incentivo: number | null;
  };
  certificadoOrigen: string | null;
  liquidaciones: LiquidacionDetalle[];
  rutas: TramoRuta[];
  manifiesto: {
    origen: string | null;
    aduana: string | null;
    anio: string | null;
    tipo: string | null;
    numero: string | null;
    vuelo: string | null;
    fechaArribo: string | null;
    horaArribo: string | null;
    secuencial: string | null;
    referencia: string | null;
  } | null;
  marcas: Array<{ orden: number; consignatario: RefMaestro | null }>;
  medidas: Array<{
    orden: number;
    largo: number | null;
    ancho: number | null;
    alto: number | null;
    fulls: number | null;
    piezas: number | null;
    kgs: number | null;
  }>;
  guias: GuiaHijaDetalle[];
  datosLegacy: Record<string, unknown> | null;
  auditoria: {
    creadoPor: string | null;
    creadoEn: string | null;
    actualizadoPor: string | null;
    actualizadoEn: string | null;
  };
}
