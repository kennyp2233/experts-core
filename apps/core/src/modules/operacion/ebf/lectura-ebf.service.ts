import { Injectable, Logger } from '@nestjs/common';
import { EbfPortalService } from '../../integrations/ebf-portal/ebf-portal.service';
import type { CoordinacionListItem } from '../../integrations/ebf-portal/types/coordinacion.types';
import type { CustomerAwbListItem } from '../../integrations/ebf-portal/types/customer-awb.types';
import { FilaEbf, normEbf, normGuia } from './conciliacion-ebf';

/** Una guía de Experts en el portal de cliente de EBF (una fila por guía × marca). */
export interface GuiaEbf {
  /** Como la muestra EBF: la real ("369-1176 3570") o la provisional ("EBF-0000 6915") */
  guia: string;
  provisional: boolean;
  marca: string;
  etd: string | null;
  destinoFinal: string | null;
  aerolinea: string | null;
  estado: string;
  fulls: number;
  cajas: number;
  fullsBodega: number;
  cajasBodega: number;
  pesoBruto: number;
  pesoCobrable: number;
}

export interface LecturaEbf {
  guia: GuiaEbf | null;
  filas: FilaEbf[];
  avisos: string[];
}

/** Las listas del portal tardan: lo leído vale 2 minutos (salvo `fresco`). */
const VIGENCIA_MS = 2 * 60 * 1000;
const MAX_PAGINAS = 6;

const MESES: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/** "21-Oct-2026" → "2026-10-21" (ETD del despacho). */
export function isoDeEtd(s: string | null): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec((s ?? '').trim());
  if (!m || !MESES[m[2].toUpperCase()]) return null;
  return `${m[3]}-${MESES[m[2].toUpperCase()]}-${m[1].padStart(2, '0')}`;
}

/** "20-10-2026 13:56" (hora de Ecuador) → día "2026-10-20" y el instante. */
export function creacionEbf(s: string | null): { dia: string | null; en: Date | null } {
  const m = /^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec((s ?? '').trim());
  if (!m) return { dia: null, en: null };
  const dia = `${m[3]}-${m[2]}-${m[1]}`;
  const en = new Date(`${dia}T${m[4] ?? '00'}:${m[5] ?? '00'}:00-05:00`);
  return { dia, en: Number.isFinite(en.getTime()) ? en : null };
}

/** "1.036,500" → 1036.5 */
const numEbf = (s: string | null): number => {
  const n = parseFloat((s ?? '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const sumarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

export function filaDeDespacho(i: CoordinacionListItem): FilaEbf {
  const c = creacionEbf(i.creacionFecha);
  const id = i.detalleId ? parseInt(i.detalleId, 10) : NaN;
  return {
    detalleId: Number.isFinite(id) ? id : null,
    hawb: i.hawb,
    exportador: i.exportador ?? '',
    marcacion: i.marcacion ?? '',
    producto: i.producto ?? '',
    dae: i.dae,
    fulls: numEbf(i.bxsCoo),
    cajas: Math.round(numEbf(i.pcsCoo)),
    fullsBodega: numEbf(i.bxsWh),
    cajasBodega: Math.round(numEbf(i.pcsWh)),
    diaCoordinacion: c.dia,
    creadaEn: c.en,
    creadaPor: i.creacionUser,
  };
}

function guiaDeCliente(i: CustomerAwbListItem): GuiaEbf {
  return {
    guia: i.awbNumber,
    provisional: /^EBF/i.test(i.awbNumber),
    marca: i.consignee ?? '',
    etd: i.etd,
    destinoFinal: i.destinoFinal,
    aerolinea: i.airline,
    estado: i.stateLabel || i.state,
    fulls: i.bxsCoo,
    cajas: i.pcsCoo,
    fullsBodega: i.bxsWh,
    cajasBodega: i.pcsWh,
    pesoBruto: i.grossWeight,
    pesoCobrable: i.chargeWeight,
  };
}

/**
 * Lecturas acotadas del portal EBF para una coordinación (ADR 0004): nunca se
 * recorre el despacho completo (es de todos los clientes de EBF).
 *
 * 1. Portal de cliente, por rango de fechas: solo trae las guías de Experts.
 *    Ahí se encuentra la guía de EBF de la coordinación (por número, o por
 *    marca + fecha mientras EBF tiene una provisional).
 * 2. Despacho (vuelos que vienen) o histórico (los de hoy para atrás) del
 *    manager, filtrado por esa guía: las filas por finca.
 */
@Injectable()
export class LecturaEbfService {
  private readonly logger = new Logger(LecturaEbfService.name);
  private readonly cacheCliente = new Map<string, { en: number; items: CustomerAwbListItem[] }>();
  private readonly cacheFilas = new Map<string, { en: number; filas: FilaEbf[] }>();

  constructor(private readonly portal: EbfPortalService) {}

  /** Guías de Experts en EBF con salida entre `desde` y `hasta` (todas las páginas). */
  async guiasDeExperts(desde: string, hasta: string, fresco = false): Promise<CustomerAwbListItem[]> {
    const k = `${desde}|${hasta}`;
    const hit = this.cacheCliente.get(k);
    if (!fresco && hit && Date.now() - hit.en < VIGENCIA_MS) return hit.items;
    const items: CustomerAwbListItem[] = [];
    for (let page = 1; page <= MAX_PAGINAS; page++) {
      const r = await this.portal.customer.list({ etdStart: desde, etdEnd: hasta, page });
      items.push(...r.items);
      if (!r.hasNextPage) break;
    }
    this.cacheCliente.set(k, { en: Date.now(), items });
    return items;
  }

  /** Filas del manager de una guía de EBF (despacho si el vuelo viene, histórico si ya salió o sale hoy). */
  async filasDeGuia(guia: string, fechaVuelo: string, hoy: string, fresco = false): Promise<FilaEbf[]> {
    const awb = guia.replace(/\s/g, '');
    const k = `${awb}|${fechaVuelo}`;
    const hit = this.cacheFilas.get(k);
    if (!fresco && hit && Date.now() - hit.en < VIGENCIA_MS) return hit.filas;
    const orden = fechaVuelo > hoy ? [false, true] : [true, false];
    let filas: FilaEbf[] = [];
    for (const includeHistorico of orden) {
      const items: CoordinacionListItem[] = [];
      for (let page = 1; page <= MAX_PAGINAS; page++) {
        const r = await this.portal.coordinacion.list({
          includeHistorico,
          awb,
          page,
          ...(includeHistorico ? { etdStart: sumarDias(fechaVuelo, -7), etdEnd: sumarDias(fechaVuelo, 7) } : {}),
        });
        items.push(...r.items);
        if (!r.hasNextPage) break;
      }
      // El filtro del portal es "contiene": se queda solo la guía exacta.
      filas = items.filter((i) => normGuia(i.awb) === normGuia(awb)).map(filaDeDespacho);
      if (filas.length) break;
    }
    this.cacheFilas.set(k, { en: Date.now(), filas });
    return filas;
  }

  /**
   * Lo que EBF tiene para una coordinación. `guiaFija`: la guía de EBF elegida
   * a mano cuando hay más de una para la misma marca y día.
   */
  async leer(args: {
    numeroGuia: string | null;
    fechaVuelo: string;
    marca: string | null;
    guiaFija: string | null;
    hoy: string;
    fresco?: boolean;
  }): Promise<LecturaEbf> {
    const { fechaVuelo, hoy, fresco = false } = args;
    const avisos: string[] = [];
    const items = await this.guiasDeExperts(sumarDias(fechaVuelo, -1), sumarDias(fechaVuelo, 1), fresco);

    let elegida: CustomerAwbListItem | null = null;
    const buscada = normGuia(args.guiaFija ?? args.numeroGuia);
    const porGuia = buscada ? items.filter((i) => normGuia(i.awbNumber) === buscada) : [];
    if (porGuia.length) {
      elegida = porGuia.find((i) => normEbf(i.consignee) === normEbf(args.marca)) ?? porGuia[0];
    } else if (args.marca) {
      const delDia = items.filter((i) => normEbf(i.consignee) === normEbf(args.marca) && i.etd === fechaVuelo);
      if (delDia.length === 1) {
        elegida = delDia[0];
        if (!/^EBF/i.test(elegida.awbNumber) && args.numeroGuia) {
          avisos.push(
            `EBF tiene la guía ${elegida.awbNumber} para ${args.marca} el ${fechaVuelo}; la coordinación tiene ${args.numeroGuia}.`,
          );
        }
      } else if (delDia.length > 1) {
        avisos.push(
          `EBF tiene ${delDia.length} guías de ${args.marca} para el ${fechaVuelo} (${delDia
            .map((i) => i.awbNumber)
            .join(', ')}): elegir cuál es la de esta coordinación.`,
        );
      }
    }
    if (!elegida) {
      if (!avisos.length) avisos.push(`EBF todavía no tiene una guía de ${args.marca ?? 'esta marca'} para el ${fechaVuelo}.`);
      return { guia: null, filas: [], avisos };
    }
    const filas = await this.filasDeGuia(elegida.awbNumber, fechaVuelo, hoy, fresco);
    return { guia: guiaDeCliente(elegida), filas, avisos };
  }

  /** Olvida lo leído de una guía (después de enviar, para releer en vivo). */
  olvidar(): void {
    this.cacheCliente.clear();
    this.cacheFilas.clear();
  }
}
