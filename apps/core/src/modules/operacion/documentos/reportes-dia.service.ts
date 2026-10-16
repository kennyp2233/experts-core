import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import * as XLSX from 'xlsx';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { NombresMaestrosService, ref, RefMaestro } from '../maestros/nombres-maestros.service';

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
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja['!cols'] = anchos.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, nombreHoja);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Los dos reportes del día de vuelo que estaban en la lista de coordinaciones
 * del sistema viejo (frmPIN_Coordina): "Programación de Vuelo" (repProg.xlt)
 * y "Reporte Antinarcóticos" (repAntinarcoticosN.xlt). Mismas columnas y orden.
 */
@Injectable()
export class ReportesDiaService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
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
}
