import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import * as XLSX from 'xlsx';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { NombresMaestrosService, ref, RefMaestro } from '../maestros/nombres-maestros.service';
import { contactoExperts } from './contacto';
import { GuiaReserva, hojaReserva } from './reservas-formatos';

/** Nombre de la agencia y de la paletizadora como salen en el reporte del sistema viejo. */
const AGENCIA = () => process.env.REPORTE_AGENCIA || 'EXPERTS HANDLING CARGO S. A.';
const PALETIZADORA = () => process.env.REPORTE_PALETIZADORA || 'EL PISQUE';

export interface ArchivoReporte {
  nombreArchivo: string;
  contenido: Buffer;
}

const corto = (r: RefMaestro | null) => (r ? r.alias || r.nombre : '');
const fechaTexto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const redondeo = (v: number) => Math.round(v * 100) / 100;

function libro(nombreHoja: string, filas: unknown[][], anchos: number[]): Buffer {
  return libroHojas([{ nombre: nombreHoja, filas, anchos }]);
}

interface HojaLibro {
  nombre: string;
  /** Una celda puede ser `{ t, v, f }` para dejar una fórmula. */
  filas: unknown[][];
  /** null = columna oculta. */
  anchos: Array<number | null>;
  uniones?: string[];
  margenes?: XLSX.MarginInfo;
}

function libroHojas(hojas: HojaLibro[]): Buffer {
  const wb = XLSX.utils.book_new();
  const usados = new Set<string>();
  for (const h of hojas) {
    const hoja = XLSX.utils.aoa_to_sheet(h.filas);
    hoja['!cols'] = h.anchos.map((wch) => (wch === null ? { wch: 0, hidden: true } : { wch }));
    if (h.uniones?.length) hoja['!merges'] = h.uniones.map((u) => XLSX.utils.decode_range(u));
    if (h.margenes) hoja['!margins'] = h.margenes;
    // Excel: hasta 31 caracteres, sin : \ / ? * [ ] y sin repetir.
    let nombre = h.nombre.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Hoja';
    for (let i = 2; usados.has(nombre); i++) nombre = `${nombre.slice(0, 28)} ${i}`;
    usados.add(nombre);
    XLSX.utils.book_append_sheet(wb, hoja, nombre);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Varios renglones (ConsignatarioGuiaM guarda saltos de línea) en una sola celda. */
const enCelda = (t: string | null | undefined) =>
  (t ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .join('\n');

/**
 * Los reportes del día de vuelo que estaban en la lista de coordinaciones del
 * sistema viejo (frmPIN_Coordina): "Programación de Vuelo" (repProg.xlt) y
 * "Reporte Antinarcóticos" (repAntinarcoticosN.xlt), con las mismas columnas y
 * orden; y "Reservas" con la plantilla de cada aerolínea (Reportes Consolidados
 * del viejo).
 */
@Injectable()
export class ReportesDiaService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
    private readonly nombres: NombresMaestrosService,
  ) {}

  private async delDia(dia: string, idAerolinea?: number) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new BadRequestException('Elija un día de vuelo (AAAA-MM-DD).');
    const where: Prisma.DocumentoCoordinacionWhereInput = {
      fechaVuelo: new Date(`${dia}T00:00:00Z`),
      estadoActual: { not: 'ANULADO' },
      ...(idAerolinea ? { idAerolinea } : {}),
    };
    const coords = await this.db.documentoCoordinacion.findMany({
      where,
      include: {
        liquidaciones: { where: { tipo: 'NORMAL' }, select: { pesoCobrable: true } },
        rutas: { select: { tipoRuta: true, codigo: true, vuelo: true } },
        guiaHijas: { include: { detalles: { orderBy: { numeroLinea: 'asc' } } } },
      },
    });
    if (coords.length === 0) throw new BadRequestException(`No hay coordinaciones con vuelo el ${fechaTexto(dia)}.`);
    const refs = await this.nombres.resolver({
      aerolineas: coords.map((c) => c.idAerolinea),
      consignatarios: coords.flatMap((c) => [c.idConsignatario, ...c.guiaHijas.map((g) => g.idConsignatario)]),
      destinos: coords.flatMap((c) => [c.idDestinoAwb, c.idDestinoFinalDocs]),
      fincas: coords.flatMap((c) => c.guiaHijas.map((g) => g.idFinca)),
      productos: coords.flatMap((c) => c.guiaHijas.flatMap((g) => g.detalles.map((d) => d.idProducto))),
    });
    return { coords, refs };
  }

  /** Por guía: consignatario, fulls, peso y peso cobrable con sus promedios por full; total al pie. */
  async programacion(dia: string, idAerolinea?: number): Promise<ArchivoReporte> {
    const { coords, refs } = await this.delDia(dia, idAerolinea);
    const filas = coords
      .map((c) => {
        const fulls = c.totalFulls ?? 0;
        const kgs = c.totalKgs ?? 0;
        const vol = c.liquidaciones[0]?.pesoCobrable ?? c.liqPesoCobrable ?? 0;
        const marca = ref(refs.consignatarios, c.idConsignatario);
        return {
          marca: marca?.codigo || marca?.nombre || '',
          guia: c.numeroGuia ?? '',
          celdas: [fulls, kgs, fulls ? redondeo(kgs / fulls) : 0, vol, fulls ? redondeo(vol / fulls) : 0],
        };
      })
      .sort((a, b) => a.marca.localeCompare(b.marca) || a.guia.localeCompare(b.guia));
    const suma = (i: number) => redondeo(filas.reduce((s, f) => s + (f.celdas[i] as number), 0));
    const [fulls, kgs, vol] = [suma(0), suma(1), suma(3)];
    const datos: unknown[][] = [
      ['EMPRESA:', 'EXPERTS'],
      ['FECHA:', fechaTexto(dia)],
      ['REPORTE:', 'PROGRAMACION'],
      [],
      ['CONSIGNATARIO', 'FULL', 'PESO', 'PROMEDIO', 'PESO VOLUMEN', 'PROMEDIO VOLUMEN', 'FECHA DESPACHO', 'AWB'],
      ...filas.map((f) => [f.marca, ...f.celdas, fechaTexto(dia), f.guia]),
      ['TOTAL', fulls, kgs, fulls ? redondeo(kgs / fulls) : 0, vol, fulls ? redondeo(vol / fulls) : 0],
    ];
    return {
      nombreArchivo: `programacion-${dia}.xlsx`,
      contenido: libro('Programación', datos, [34, 8, 10, 10, 14, 18, 16, 16]),
    };
  }

  /**
   * Una fila por línea del detalle (finca), para la Policía Antinarcóticos.
   * Como el viejo: PIEZAS = cajas y CAJAS = fulls; ordenado por aerolínea,
   * guía y finca. Las líneas de novedad (0 cajas y 0 fulls) no llevan carga y
   * no se listan. Conductor, cédula y placa se llenan a mano.
   */
  async antinarcoticos(dia: string, idAerolinea?: number): Promise<ArchivoReporte> {
    const { coords, refs } = await this.delDia(dia, idAerolinea);
    const filas = coords.flatMap((c) => {
      const aerolinea = corto(ref(refs.aerolineas, c.idAerolinea));
      const destino = ref(refs.destinos, c.idDestinoFinalDocs ?? c.idDestinoAwb)?.codigo ?? '';
      return c.guiaHijas.flatMap((g) => {
        const finca = ref(refs.fincas, g.idFinca);
        const marca = ref(refs.consignatarios, g.idConsignatario ?? c.idConsignatario);
        return g.detalles
          .filter((d) => (d.cantidadCajas ?? 0) > 0 || (d.fulls ?? 0) > 0)
          .map((d) => ({
            orden: [aerolinea, c.numeroGuia ?? '', corto(finca)],
            celdas: [
              aerolinea,
              PALETIZADORA(),
              c.numeroGuia ?? '',
              g.numeroGuiaHija ?? '',
              corto(finca),
              finca?.codigo ?? '',
              destino,
              marca?.codigo || marca?.nombre || '',
              d.cantidadCajas ?? 0,
              d.fulls ?? 0,
              d.codigoProducto ?? ref(refs.productos, d.idProducto)?.nombre ?? '',
              d.dae ?? g.dae ?? '',
              d.valor ?? 0,
            ],
          }));
      });
    });
    filas.sort((a, b) => a.orden.join('\u0000').localeCompare(b.orden.join('\u0000')));
    const datos: unknown[][] = [
      ['POLICÍA NACIONAL DEL ECUADOR'],
      ['DIRECCIÓN NACIONAL ANTINARCÓTICOS'],
      ['UNIDAD DE INFORMACIÓN DE PUERTOS Y AEROPUERTOS JJO-G'],
      [],
      ['AGENCIA:', AGENCIA(), '', 'FECHA:', fechaTexto(dia)],
      [],
      [
        'ORD.',
        'AEROLINEA',
        'PALETIZADORA',
        'GUIA MASTER',
        'No. DE GUIA HIJA',
        'NOMBRE DE SHIPPER',
        'RUC DEL SHIPPER',
        'DESTINO',
        'CONSIGNATARIO',
        'PIEZAS',
        'CAJAS',
        'DESCRIPCION DEL PRODUCTO',
        'NUMERO DE DAE',
        'APROXIMADO COSTO DEL ENVIO',
        'NOMBRE CONDUCTOR',
        'Nro. CEDULA',
        'PLACA DEL VEHICULO',
      ],
      ...filas.map((f, i) => [i + 1, ...f.celdas]),
    ];
    return {
      nombreArchivo: `antinarcoticos-${dia}.xlsx`,
      contenido: libro('Antinarcóticos', datos, [6, 16, 14, 16, 14, 28, 15, 9, 30, 8, 8, 18, 22, 14, 22, 12, 12]),
    };
  }

  /**
   * Reservas, como frmPINRepGen.Proc_83CAE0: una hoja por aerolínea con el
   * formato de su plantilla (aerPlantillaReservas; ver reservas-formatos.ts) y
   * una fila por guía con los datos de la consulta del viejo (marca, consignee,
   * país, origen, guía, pago, destino, tipo de embarque, datos del consignee,
   * notify). Las cajas son los fulls de la reserva de la guía (o lo coordinado si
   * no tiene) y el peso es una fórmula con los kg por full de la plantilla.
   */
  async reservas(dia: string, idAerolinea?: number): Promise<ArchivoReporte> {
    const { coords, refs } = await this.delDia(dia, idAerolinea);
    const idsMarca = [...new Set(coords.map((c) => c.idConsignatario).filter((x): x is number => x !== null))];
    const idsEmbarque = [...new Set(coords.map((c) => c.idTipoEmbarque).filter((x): x is number => x !== null))];
    const idsAerolinea = [...new Set(coords.map((c) => c.idAerolinea).filter((x): x is number => x !== null))];
    const [marcas, guiasM, embarques, plantillas] = await Promise.all([
      this.maestros.consignatario.findMany({ where: { id: { in: idsMarca } }, select: { id: true, paisSigla: true } }),
      this.maestros.consignatarioGuiaM.findMany({ where: { idConsignatario: { in: idsMarca } } }),
      this.maestros.tipoEmbarque.findMany({ where: { id: { in: idsEmbarque } }, select: { id: true, nombre: true } }),
      this.maestros.aerolineasPlantilla.findMany({
        where: { idAerolinea: { in: idsAerolinea } },
        select: { idAerolinea: true, plantillaReservas: true },
      }),
    ]);
    const pais = new Map(marcas.map((m) => [m.id, m.paisSigla ?? '']));
    const gm = new Map(guiasM.map((g) => [g.idConsignatario, g]));
    const emb = new Map(embarques.map((e) => [e.id, e.nombre]));
    const plantillaDe = new Map(plantillas.map((p) => [p.idAerolinea, p.plantillaReservas]));

    const porAerolinea = new Map<number | null, typeof coords>();
    for (const c of coords) porAerolinea.set(c.idAerolinea, [...(porAerolinea.get(c.idAerolinea) ?? []), c]);

    const hojas = [...porAerolinea.entries()]
      .map(([id, cs]) => {
        const aerolinea = ref(refs.aerolineas, id);
        const guias: GuiaReserva[] = cs
          .map((c) => {
            const marca = ref(refs.consignatarios, c.idConsignatario);
            const g = c.idConsignatario !== null ? gm.get(c.idConsignatario) : undefined;
            return {
              marca: marca?.codigo || marca?.nombre || '',
              consignee: g?.guiaMConsignee ?? marca?.nombre ?? '',
              codigoCliente: c.idConsignatario !== null ? (pais.get(c.idConsignatario) ?? '') : '',
              origen: c.rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo || 'UIO',
              awb: c.numeroGuia ?? '',
              pago: c.pago === 'COLLECT' ? 'CC' : 'PP',
              destino: ref(refs.destinos, c.idDestinoAwb)?.codigo ?? '',
              tipoCarga: c.idTipoEmbarque !== null ? (emb.get(c.idTipoEmbarque) ?? '') : '',
              consigneeDatos: enCelda(g?.guiaMNameAddress),
              fulls: c.cupoFulls || c.totalFulls || null,
            } satisfies GuiaReserva;
          })
          .sort((a, b) => a.marca.localeCompare(b.marca) || a.awb.localeCompare(b.awb));
        // El vuelo va en la fila VIA del primer tramo; solo si todas las guías van en el mismo.
        const vuelos = new Set(cs.map((c) => c.rutas.find((r) => r.tipoRuta === 'VIA1')?.vuelo?.trim()).filter(Boolean));
        const plantilla = cs.find((c) => c.plantillaReservas)?.plantillaReservas ?? (id !== null ? plantillaDe.get(id) : null);
        const hoja = hojaReserva(plantilla, {
          aerolinea: corto(aerolinea),
          codigo: aerolinea?.codigo ?? '',
          vuelo: vuelos.size === 1 ? [...vuelos][0]! : '',
          dia,
          agencia: AGENCIA(),
          contacto: contactoExperts(),
          guias,
        });
        return { nombre: corto(aerolinea) || 'Sin aerolínea', ...hoja };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { nombreArchivo: `reservas-${dia}.xlsx`, contenido: libroHojas(hojas) };
  }
}
