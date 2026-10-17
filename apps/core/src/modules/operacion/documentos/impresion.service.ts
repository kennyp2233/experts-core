import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';

const lineas = (t: string | null | undefined) =>
  (t ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/** "OCT-13-2026", como lo imprime el sistema viejo. */
const fechaAwb = (d: Date) =>
  `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()}-${String(d.getUTCDate()).padStart(2, '0')}-${d.getUTCFullYear()}`;

export interface GuiaHijaImpresion {
  numero: string;
  finca: { nombre: string; ruc: string | null; direccion: string[]; telefono: string | null; ciudad: string | null; pais: string | null };
  dae: string | null;
  piezas: number;
  kg: number;
  fulls: number;
  productos: string[];
}

export interface ImpresionGuiasHijas {
  mawb: string | null;
  fecha: string;
  empresa: { nombre: string; ruc: string; direccion: string; ciudad: string; pais: string; telefono: string };
  origen: { codigo: string; aeropuerto: string };
  destino: { codigo: string | null; aeropuerto: string | null };
  tramos: Array<{ hasta: string | null; por: string | null }>;
  aerolinea: string | null;
  pago: 'PP' | 'CC';
  consignee: string[];
  notify: string[];
  tipoEmbarque: string | null;
  manifiesto: string | null;
  guias: GuiaHijaImpresion[];
}

/**
 * Datos para imprimir las guías hijas por finca, como "Guías Hija por Finca"
 * del sistema viejo (repCoordina2.rpt): una House Air Waybill por guía hija,
 * en hoja blanca, con la finca como shipper, el consignatario y el notify de
 * la guía hija de la marca, Experts como agente emisor y "AS AGREED".
 */
@Injectable()
export class ImpresionService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  async guiasHijas(id: number, idGuiaHija?: number): Promise<ImpresionGuiasHijas> {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: {
        rutas: { orderBy: { orden: 'asc' } },
        manifiesto: true,
        guiaHijas: {
          where: idGuiaHija ? { id: idGuiaHija } : undefined,
          orderBy: { secuencial: 'asc' },
          include: { detalles: true },
        },
      },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    if (c.guiaHijas.length === 0) throw new NotFoundException('La coordinación no tiene guías hijas.');

    const codigoOrigen = c.rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo || 'UIO';
    const [params, origen, destino, aerolinea, consH, fincas, productos, embarque] = await Promise.all([
      this.maestros.parametro.findMany({ where: { clave: { startsWith: 'EMPRESA.' } } }),
      this.maestros.origen.findUnique({ where: { codigo: codigoOrigen } }),
      c.idDestinoAwb ? this.maestros.destino.findUnique({ where: { id: c.idDestinoAwb } }) : null,
      c.idAerolinea ? this.maestros.aerolinea.findUnique({ where: { id: c.idAerolinea } }) : null,
      c.idConsignatario ? this.maestros.consignatarioGuiaH.findUnique({ where: { idConsignatario: c.idConsignatario } }) : null,
      this.maestros.finca.findMany({ where: { id: { in: c.guiaHijas.map((g) => g.idFinca) } } }),
      this.maestros.producto.findMany({
        where: { id: { in: c.guiaHijas.flatMap((g) => g.detalles.map((d) => d.idProducto)).filter((x): x is number => x !== null) } },
      }),
      c.idTipoEmbarque ? this.maestros.tipoEmbarque.findUnique({ where: { id: c.idTipoEmbarque } }) : null,
    ]);
    const p = (k: string) => params.find((x) => x.clave === `EMPRESA.${k}`)?.valorTexto?.trim() ?? '';
    const fincaDe = new Map(fincas.map((f) => [f.id, f]));
    const productoDe = new Map(productos.map((x) => [x.id, x]));
    const tramos = [1, 2, 3]
      .map((n) => ({
        hasta: c.rutas.find((r) => r.tipoRuta === `DESTINO${n}`)?.codigo ?? null,
        por: c.rutas.find((r) => r.tipoRuta === `VIA${n}`)?.codigo ?? null,
      }))
      .filter((t) => t.hasta || t.por);
    const m = c.manifiesto;

    return {
      mawb: c.numeroGuia,
      fecha: fechaAwb(c.fechaVuelo),
      empresa: {
        nombre: p('empNombre') || 'EXPERTS HANDLING CARGO S.A.',
        ruc: p('empRUC'),
        direccion: p('empDireccion'),
        ciudad: p('empCiudad'),
        pais: p('empPais') || 'ECUADOR',
        telefono: p('empFono'),
      },
      origen: { codigo: codigoOrigen, aeropuerto: origen?.aeropuerto || origen?.nombre || codigoOrigen },
      destino: { codigo: destino?.codigo ?? null, aeropuerto: destino?.aeropuerto || destino?.nombre || null },
      tramos,
      aerolinea: aerolinea ? aerolinea.alias?.trim() || aerolinea.nombre : null,
      pago: c.pago === 'COLLECT' ? 'CC' : 'PP',
      consignee: lineas(consH?.guiaHNameAdress),
      notify: lineas(consH?.guiaHNotify),
      tipoEmbarque: embarque?.nombre ?? null,
      manifiesto: m?.referencia ?? null,
      guias: c.guiaHijas.map((g) => {
        const f = fincaDe.get(g.idFinca);
        const nombres = [
          ...new Set(
            g.detalles.map((d) => d.codigoProducto ?? (d.idProducto ? productoDe.get(d.idProducto)?.nombre : null)).filter(Boolean) as string[],
          ),
        ];
        return {
          numero: g.numeroGuiaHija,
          finca: {
            nombre: f?.nombreFinca ?? '',
            ruc: f?.rucFinca ?? null,
            direccion: lineas(f?.direccion),
            telefono: f?.iGeneralTelefono ?? null,
            ciudad: f?.iGeneralCiudad ?? null,
            pais: f?.iGeneralPais ?? null,
          },
          dae: g.dae ?? g.detalles.find((d) => d.dae)?.dae ?? null,
          piezas: g.detalles.reduce((s, d) => s + d.cantidadCajas, 0),
          kg: g.detalles.reduce((s, d) => s + (d.pesoKg ?? 0), 0),
          fulls: g.detalles.reduce((s, d) => s + (d.fulls ?? 0), 0),
          productos: nombres,
        };
      }),
    };
  }
}
