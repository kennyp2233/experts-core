import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { ImpresionService } from './impresion.service';

const lineas = (t: string | null | undefined) =>
  (t ?? '')
    .split(/\r?\n|\|\|/)
    .map((x) => x.trim())
    .filter(Boolean);

/** "369-1176 3846" a partir de "369-11763846", "36911763846" o ya formateado. */
const formatoAwb = (n: string | null | undefined) => {
  if (!n) return '';
  const d = n.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)} ${d.slice(7)}` : n.trim();
};

/** "2026/10/20", como escribe las fechas el Excel del viejo. */
const fechaBarra = (d: Date | null | undefined) =>
  d ? `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}` : '';

const r2 = (v: number) => Math.round(v * 100) / 100;
const uniq = (xs: Array<number | null | undefined>) => [...new Set(xs.filter((x): x is number => typeof x === 'number'))];

/** Tallos por full si el parámetro no está (MPARAMS.parSTEMSxFULL). */
const TALLOS_POR_FULL = 700;

export interface FilaExportList {
  finca: string;
  hawb: string;
  sesa: string;
  dae: string;
  /** BXS = fulls */
  bxs: number;
  /** PCS = cajas */
  pcs: number;
  stems: number;
  kgs: number;
  factura: string;
  fecha: string;
  valor: number;
  ruc: string;
  direccion: string;
  producto: string;
}

export interface ExportList {
  titulo: string;
  agencia: string;
  agenciaRuc: string;
  aerolinea: string;
  marca: string;
  awb: string;
  fecha: string;
  filas: FilaExportList[];
  totales: { bxs: number; pcs: number; stems: number; kgs: number; valor: number };
}

export interface Etiqueta {
  hawb: string;
  finca: string;
  /** Piezas de la guía hija. */
  piezas: number;
}

export interface Etiquetas {
  shipper: string;
  /** Código IATA de la aerolínea (aerPaisSigla del viejo) y su alias. */
  aerolineaCodigo: string;
  aerolinea: string;
  awb: string;
  origen: string;
  destino: string;
  marca: string;
  /** Piezas de toda la guía (docCajas). */
  totalPiezas: number;
  fecha: string;
  guias: Etiqueta[];
}

export type ExportadorFormaA = 'cliente' | 'agencia';
export type CantidadFormaA = 'piezas' | 'fulls';

export interface FormaA {
  exportador: { lineas: string[]; tipo: ExportadorFormaA };
  consignatario: string[];
  aerolinea: string;
  ruta: string;
  awb: string;
  cantidad: number;
  unidad: 'PCS' | 'BXS';
  descripcion: string;
  /** Una línea por producto con sus kg (variante de Administración de CO). */
  productos: Array<{ descripcion: string; kg: number }>;
  criterio: string;
  kgs: number;
  fecha: string;
  paisImportador: string;
  certificado: string | null;
  lugar: string;
}

/**
 * Documentos por guía que el sistema viejo armaba en Excel (plantillas .xlt de
 * RPT\XLT): Export List (ExportList.xlt), Etiquetas (tv_Etiquetas) y Form A
 * (repFormaA.xlt, tv_FormaA_Clientes / _Shippers). Devuelven los datos ya
 * armados; el front los imprime.
 */
@Injectable()
export class DocumentosGuiaService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
    private readonly impresion: ImpresionService,
  ) {}

  private async coordinacion(id: number) {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: {
        rutas: { orderBy: { orden: 'asc' } },
        guiaHijas: { orderBy: { secuencial: 'asc' }, include: { detalles: { orderBy: { numeroLinea: 'asc' } } } },
      },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    return c;
  }

  /**
   * Export List, como frmPIN_Coordina.Proc_715030 llenando ExportList.xlt: la
   * agencia (shipper) y la IATA con su RUC, la aerolínea con RUC, la marca, el AWB
   * y la fecha; una fila por finca + guía hija + DAE + factura + fecha + producto
   * (solo las que tienen fulls), ordenadas por finca, con totales al pie.
   */
  async exportList(id: number): Promise<ExportList> {
    const c = await this.coordinacion(id);
    const detalles = c.guiaHijas.flatMap((g) => g.detalles.map((d) => ({ g, d })));
    const [empresa, agencia, aerolinea, marca, fincas, productos, tallosPorFull] = await Promise.all([
      this.impresion.empresa(),
      c.idAgenciaIata ? this.maestros.agenciaIata.findUnique({ where: { id: c.idAgenciaIata } }) : null,
      c.idAerolinea ? this.maestros.aerolinea.findUnique({ where: { id: c.idAerolinea } }) : null,
      c.idConsignatario ? this.maestros.consignatario.findUnique({ where: { id: c.idConsignatario }, select: { nombre: true, alias: true } }) : null,
      this.maestros.finca.findMany({ where: { id: { in: uniq(detalles.map(({ g, d }) => d.idFinca ?? g.idFinca)) } } }),
      this.maestros.producto.findMany({
        where: { id: { in: uniq(detalles.map(({ d }) => d.idProducto)) } },
        select: { id: true, codigo: true, nombre: true, referencia: true },
      }),
      this.tallosPorFull(),
    ]);
    const finca = new Map(fincas.map((f) => [f.id, f]));
    const producto = new Map(productos.map((p) => [p.id, p]));

    const grupos = new Map<string, FilaExportList>();
    for (const { g, d } of detalles) {
      if (!((d.fulls ?? 0) > 0)) continue;
      const f = finca.get(d.idFinca ?? g.idFinca ?? -1);
      const p = d.idProducto ? producto.get(d.idProducto) : undefined;
      const fila: FilaExportList = {
        finca: f?.nombreFinca ?? '',
        hawb: g.numeroGuiaHija,
        sesa: f?.iGeneralCodSesa ?? '',
        dae: d.dae ?? g.dae ?? '',
        bxs: d.fulls ?? 0,
        pcs: d.cantidadCajas,
        stems: d.tallos ?? Math.round((d.fulls ?? 0) * tallosPorFull),
        kgs: d.pesoKg ?? 0,
        factura: d.factura ?? '',
        fecha: fechaBarra(d.fechaRegistro),
        valor: d.valor ?? 0,
        ruc: f?.rucFinca ?? '',
        direccion: lineas(f?.direccion).join(' '),
        producto: p?.referencia || p?.nombre || d.codigoProducto || '',
      };
      const k = [fila.finca, fila.hawb, fila.sesa, fila.dae, fila.factura, fila.fecha, fila.ruc, fila.direccion, fila.producto].join('\u0000');
      const e = grupos.get(k);
      if (e) {
        e.bxs += fila.bxs;
        e.pcs += fila.pcs;
        e.stems += fila.stems;
        e.kgs += fila.kgs;
        e.valor += fila.valor;
      } else grupos.set(k, fila);
    }
    const filas = [...grupos.values()]
      .map((f) => ({ ...f, bxs: r2(f.bxs), kgs: r2(f.kgs), valor: r2(f.valor) }))
      .sort((a, b) => a.finca.localeCompare(b.finca) || a.hawb.localeCompare(b.hawb));
    const suma = (k: 'bxs' | 'pcs' | 'stems' | 'kgs' | 'valor') => r2(filas.reduce((s, f) => s + f[k], 0));
    return {
      titulo: `EXPORT LIST ${empresa.nombre}`,
      agencia: agencia?.nombreShipper ?? empresa.nombre,
      agenciaRuc: [agencia?.nombreCarrier ?? agencia?.nombreShipper, agencia?.rucCarrier ?? agencia?.rucShipper].filter(Boolean).join(' RUC '),
      aerolinea: [aerolinea?.nombre, aerolinea?.ciRuc].filter(Boolean).join(' RUC '),
      marca: marca?.alias?.trim() || marca?.nombre || '',
      awb: formatoAwb(c.numeroGuia),
      fecha: fechaBarra(c.fechaVuelo),
      filas,
      totales: { bxs: suma('bxs'), pcs: suma('pcs'), stems: suma('stems'), kgs: suma('kgs'), valor: suma('valor') },
    };
  }

  /**
   * Etiquetas, como tv_Etiquetas del viejo: los datos de la guía madre (shipper,
   * aerolínea, AWB, origen, destino, marca, piezas totales) y una entrada por guía
   * hija con su finca y sus piezas. El diseño lo pone el front (el viejo usaba una
   * plantilla de Excel que no tenemos).
   */
  async etiquetas(id: number): Promise<Etiquetas> {
    const c = await this.coordinacion(id);
    const [agencia, aerolinea, marca, destino, fincas] = await Promise.all([
      c.idAgenciaIata ? this.maestros.agenciaIata.findUnique({ where: { id: c.idAgenciaIata }, select: { nombreShipper: true } }) : null,
      c.idAerolinea ? this.maestros.aerolinea.findUnique({ where: { id: c.idAerolinea }, select: { nombre: true, alias: true, codigo: true } }) : null,
      c.idConsignatario ? this.maestros.consignatario.findUnique({ where: { id: c.idConsignatario }, select: { nombre: true } }) : null,
      c.idDestinoAwb ? this.maestros.destino.findUnique({ where: { id: c.idDestinoAwb }, select: { codigo: true } }) : null,
      this.maestros.finca.findMany({ where: { id: { in: uniq(c.guiaHijas.map((g) => g.idFinca)) } }, select: { id: true, nombreFinca: true, tag: true } }),
    ]);
    const finca = new Map(fincas.map((f) => [f.id, f]));
    const guias = c.guiaHijas
      .map((g) => {
        const f = g.idFinca !== null ? finca.get(g.idFinca) : undefined;
        return { hawb: g.numeroGuiaHija, finca: f?.tag?.trim() || f?.nombreFinca || '', piezas: g.detalles.reduce((s, d) => s + d.cantidadCajas, 0) };
      })
      .filter((e) => e.piezas > 0);
    return {
      shipper: agencia?.nombreShipper ?? (await this.impresion.empresa()).nombre,
      aerolineaCodigo: aerolinea?.codigo ?? '',
      aerolinea: aerolinea?.alias?.trim() || aerolinea?.nombre || '',
      awb: formatoAwb(c.numeroGuia),
      origen: c.rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo || 'UIO',
      destino: destino?.codigo ?? '',
      marca: marca?.nombre ?? '',
      totalPiezas: c.totalCajas ?? guias.reduce((s, g) => s + g.piezas, 0),
      fecha: fechaBarra(c.fechaVuelo),
      guias,
    };
  }

  /**
   * Form A (certificado de origen GSP), como repFormaA.xlt: exportador (el
   * cliente de la marca o la agencia IATA), consignatario (marFormaA), aerolínea,
   * ruta y AWB, cantidad en piezas o fulls, "FRESH CUT FLOWERS", criterio "P",
   * kg, fecha de despacho y país importador (del destino FITO).
   */
  async formaA(id: number, exportador: ExportadorFormaA = 'cliente', cantidad?: CantidadFormaA): Promise<FormaA> {
    const c = await this.coordinacion(id);
    const marca = c.idConsignatario
      ? await this.maestros.consignatario.findUnique({
          where: { id: c.idConsignatario },
          select: { nombre: true, idEmbarcador: true, fito: { select: { fitoFormaA: true } } },
        })
      : null;
    const detalles = c.guiaHijas.flatMap((g) => g.detalles);
    const [cliente, agencia, aerolinea, destino, productos] = await Promise.all([
      marca?.idEmbarcador ? this.maestros.embarcador.findUnique({ where: { id: marca.idEmbarcador } }) : null,
      c.idAgenciaIata ? this.maestros.agenciaIata.findUnique({ where: { id: c.idAgenciaIata } }) : null,
      c.idAerolinea ? this.maestros.aerolinea.findUnique({ where: { id: c.idAerolinea }, select: { nombre: true, modo: true } }) : null,
      this.maestros.destino.findUnique({
        where: { id: c.idDestinoFinalDocs ?? c.idDestinoAwb ?? -1 },
        select: { pais: { select: { nombre: true } } },
      }),
      this.maestros.producto.findMany({
        where: { id: { in: uniq(detalles.map((d) => d.idProducto)) } },
        select: { id: true, nombre: true, descripcion: true },
      }),
    ]);
    const tel = (t?: string | null) => (t ? `PH: ${t}` : '');
    // Hay fichas con el RUC ya escrito "RUC 179…": no repetirlo.
    const ruc = (r?: string | null) => (r ? `RUC: ${r.replace(/^\s*RUC[:.\s]*/i, '')}` : '');
    const ciudadPais = (ci?: string | null, pa?: string | null) => [ci, pa].filter(Boolean).join(' - ');
    const exp =
      exportador === 'agencia' && agencia
        ? [agencia.nombreShipper, agencia.direccionShipper, tel(agencia.telefonoShipper), ruc(agencia.rucShipper), ciudadPais(agencia.ciudadShipper, agencia.paisShipper)]
        : [cliente?.nombre, cliente?.direccion, tel(cliente?.telefono), ruc(cliente?.ci), ciudadPais(cliente?.ciudad, cliente?.pais)];
    const modo: CantidadFormaA = cantidad ?? (aerolinea?.modo === 'EN_FULLES' ? 'fulls' : 'piezas');
    const tramos = [c.rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo || 'UIO', ...[1, 2, 3].map((n) => c.rutas.find((r) => r.tipoRuta === `DESTINO${n}`)?.codigo)].filter(
      (x): x is string => !!x,
    );
    const porProducto = new Map<string, number>();
    const nombreProducto = new Map(productos.map((p) => [p.id, p.descripcion?.trim() || p.nombre]));
    for (const d of detalles) {
      const k = (d.idProducto ? nombreProducto.get(d.idProducto) : null) ?? d.codigoProducto ?? 'FLOWERS';
      porProducto.set(k, (porProducto.get(k) ?? 0) + (d.pesoKg ?? 0));
    }
    return {
      exportador: { lineas: exp.map((x) => (x ?? '').trim()).filter(Boolean), tipo: exportador === 'agencia' && agencia ? 'agencia' : 'cliente' },
      consignatario: lineas(marca?.fito?.fitoFormaA).length ? lineas(marca?.fito?.fitoFormaA) : [marca?.nombre ?? ''],
      aerolinea: aerolinea?.nombre ?? '',
      ruta: tramos.join(' / '),
      awb: formatoAwb(c.numeroGuia),
      cantidad: modo === 'fulls' ? r2(c.totalFulls ?? 0) : (c.totalCajas ?? 0),
      unidad: modo === 'fulls' ? 'BXS' : 'PCS',
      descripcion: 'FRESH  CUT  FLOWERS',
      productos: [...porProducto.entries()].map(([descripcion, kg]) => ({ descripcion, kg: r2(kg) })).sort((a, b) => a.descripcion.localeCompare(b.descripcion)),
      criterio: 'P',
      kgs: r2(c.totalKgs ?? 0),
      fecha: fechaBarra(c.fechaVuelo),
      paisImportador: destino?.pais?.nombre ?? '',
      certificado: c.certificadoOrigen,
      lugar: 'QUITO',
    };
  }

  private async tallosPorFull(): Promise<number> {
    const p = await this.maestros.parametro.findFirst({ where: { clave: 'MPARAMS.parSTEMSxFULL' } });
    return p?.valorNumero ?? TALLOS_POR_FULL;
  }
}
