import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../../database/database.module';
import { DetalleGuia, GuiaCompleta, GuiaMadre } from '../interfaces/guia-data.interface';

/** Tallos por full si el parámetro no está (MPARAMS.parSTEMSxFULL). */
const TALLOS_POR_FULL = 700;

const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

/**
 * Fuente FITO del sistema nuevo: lee las coordinaciones de Postgres (las del
 * sistema viejo llegan por el sync, las nuevas se crean aquí) y las entrega con
 * la misma forma que `FitoLegacyService`, así el asistente y el XML no cambian.
 *
 * - Fecha: la de vuelo (en Access, `extFechaDespacho`; `docFecha` es la de asignación).
 * - Tallos: los de la línea; si no los tiene (las fincas no los cargan), fulls ×
 *   tallos por full, como hacía la web vieja. Se marcan con `stemsSugeridos`.
 */
@Injectable()
export class FitoSistemaService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly docs: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  /** Coordinaciones más recientes por fecha de vuelo. */
  async listGuias(limit = 150): Promise<GuiaMadre[]> {
    const cs = await this.docs.documentoCoordinacion.findMany({
      orderBy: [{ fechaVuelo: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        numero: true,
        codigoAccess: true,
        numeroGuia: true,
        fechaVuelo: true,
        fechaAsignacion: true,
        idConsignatario: true,
        idDestinoAwb: true,
        idDestinoFinalDocs: true,
      },
    });
    const [destinos, consignatarios] = await Promise.all([
      this.destinos(cs.flatMap((c) => [c.idDestinoAwb, c.idDestinoFinalDocs])),
      this.maestros.consignatario.findMany({
        where: { id: { in: uniq(cs.map((c) => c.idConsignatario)) } },
        select: { id: true, nombre: true, direccion: true },
      }),
    ]);
    const cons = new Map(consignatarios.map((x) => [x.id, x]));
    return cs.map((c) => {
      const destino = c.idDestinoAwb ? destinos.get(c.idDestinoAwb) : undefined;
      const fito = c.idDestinoFinalDocs ? destinos.get(c.idDestinoFinalDocs) : undefined;
      const m = c.idConsignatario ? cons.get(c.idConsignatario) : undefined;
      return {
        bodCodigo: 0,
        docTipo: 'COO',
        docNumero: c.id,
        numero: c.codigoAccess ?? c.numero ?? null,
        docNumGuia: c.numeroGuia ?? '',
        marCodigo: c.idConsignatario ?? 0,
        docFecha: dia(c.fechaVuelo),
        docFechaVuelo: dia(c.fechaVuelo),
        docDestino: destino,
        docFITODestino: fito ?? destino,
        consignatarioNombre: m?.nombre,
        consignatarioDireccion: m?.direccion ?? undefined,
      };
    });
  }

  /** Líneas de la coordinación, con la marca (y su FITO), la finca y el producto. */
  async getGuiasHijas(id: number): Promise<DetalleGuia[]> {
    const c = await this.docs.documentoCoordinacion.findUnique({ where: { id }, select: { id: true, idConsignatario: true } });
    if (!c) throw new NotFoundException(`La coordinación ${id} no existe.`);
    const lineas = await this.docs.guiaHijaDetalle.findMany({
      where: { guiaHija: { idDocumentoCoordinacion: id } },
      include: { guiaHija: { select: { idFinca: true, idConsignatario: true } } },
      orderBy: [{ numeroLinea: 'asc' }, { id: 'asc' }],
    });
    const idFinca = (l: (typeof lineas)[number]) => l.idFinca ?? l.guiaHija.idFinca;
    const idMarca = (l: (typeof lineas)[number]) => l.idConsignatario ?? l.guiaHija.idConsignatario ?? c.idConsignatario;
    const [fincas, marcas, productos, tallosPorFull] = await Promise.all([
      this.maestros.finca.findMany({
        where: { id: { in: uniq(lineas.map(idFinca)) } },
        select: { id: true, nombreFinca: true, rucFinca: true },
      }),
      this.maestros.consignatario.findMany({
        where: { id: { in: uniq(lineas.map(idMarca)) } },
        select: { id: true, nombre: true, direccion: true, paisSigla: true, fito: { select: { fitoNombre: true, fitoDireccion: true } } },
      }),
      this.maestros.producto.findMany({
        where: { id: { in: uniq(lineas.filter((l) => !l.codigoProducto).map((l) => l.idProducto)) } },
        select: { id: true, codigo: true },
      }),
      this.tallosPorFull(),
    ]);
    const f = new Map(fincas.map((x) => [x.id, x]));
    const m = new Map(marcas.map((x) => [x.id, x]));
    const p = new Map(productos.map((x) => [x.id, x.codigo]));
    return lineas.map((l, i) => {
      const finca = f.get(idFinca(l) ?? -1);
      const marca = m.get(idMarca(l) ?? -1);
      const sugeridos = l.tallos === null;
      return {
        docNumero: id,
        detNumero: l.numeroLinea ?? i + 1,
        marCodigo: marca?.id ?? 0,
        plaCodigo: finca?.id ?? 0,
        proCodigo: l.codigoProducto ?? (l.idProducto ? p.get(l.idProducto) : null) ?? '',
        detNumStems: l.tallos ?? Math.round((l.fulls ?? 0) * tallosPorFull),
        stemsSugeridos: sugeridos,
        detCajas: l.cantidadCajas,
        detFecha: l.fechaRegistro?.toISOString(),
        marNombre: marca?.nombre,
        marDireccion: marca?.direccion ?? undefined,
        marPaisSigla: marca?.paisSigla ?? undefined,
        marFITO: marFito(marca?.fito?.fitoNombre, marca?.fito?.fitoDireccion),
        plaRUC: finca?.rucFinca ?? undefined,
        plaNombre: finca?.nombreFinca,
      };
    });
  }

  /** Destino por código IATA, con la forma de PIN_auxDestinos. */
  async getDestinoByCode(codigo: string) {
    const d = await this.maestros.destino.findUnique({ where: { codigo }, include: { pais: { select: { nombre: true } } } });
    if (!d) return null;
    return { desCodigo: d.codigo ?? codigo, desNombre: d.nombre ?? '', desAeropuerto: d.aeropuerto ?? '', desPais: d.pais?.nombre ?? '' };
  }

  /** Lo que se guarda junto al XML (respaldo de con qué datos se generó). */
  async getGuiaCompleta(id: number): Promise<GuiaCompleta> {
    const [guia] = (await this.listGuiasPorId(id)) ?? [];
    if (!guia) throw new Error(`Coordinación ${id} no encontrada en el sistema.`);
    const detalles = await this.getGuiasHijas(id);
    const fito = detalles[0]?.marFITO?.split('||') ?? [];
    return {
      guia: { docNumero: id, numero: guia.numero, docFecha: guia.docFechaVuelo ?? guia.docFecha, docDestino: guia.docDestino, docTipo: 'COO' },
      detalles,
      consignatario: {
        nombre: fito[0] ?? guia.consignatarioNombre ?? '',
        direccion: fito.slice(1).join(' '),
        fito: detalles[0]?.marFITO ?? '',
        paisSigla: detalles[0]?.marPaisSigla ?? '',
      },
    };
  }

  private async listGuiasPorId(id: number): Promise<GuiaMadre[]> {
    const c = await this.docs.documentoCoordinacion.findUnique({
      where: { id },
      select: { id: true, numero: true, codigoAccess: true, numeroGuia: true, fechaVuelo: true, idConsignatario: true, idDestinoAwb: true },
    });
    if (!c) return [];
    const destinos = await this.destinos([c.idDestinoAwb]);
    return [
      {
        bodCodigo: 0,
        docTipo: 'COO',
        docNumero: c.id,
        numero: c.codigoAccess ?? c.numero ?? null,
        docNumGuia: c.numeroGuia ?? '',
        marCodigo: c.idConsignatario ?? 0,
        docFecha: dia(c.fechaVuelo),
        docFechaVuelo: dia(c.fechaVuelo),
        docDestino: c.idDestinoAwb ? destinos.get(c.idDestinoAwb) : undefined,
      },
    ];
  }

  private async destinos(ids: Array<number | null>): Promise<Map<number, string>> {
    const ds = await this.maestros.destino.findMany({ where: { id: { in: uniq(ids) } }, select: { id: true, codigo: true } });
    return new Map(ds.filter((d) => d.codigo).map((d) => [d.id, d.codigo!]));
  }

  private async tallosPorFull(): Promise<number> {
    const p = await this.maestros.parametro.findFirst({ where: { clave: 'MPARAMS.parSTEMSxFULL' } });
    return p?.valorNumero ?? TALLOS_POR_FULL;
  }
}

const uniq = (xs: Array<number | null | undefined>) => [...new Set(xs.filter((x): x is number => typeof x === 'number'))];

/** Como `PIN_auxMarcas.marFITO`: "NOMBRE||DIRECCIÓN 1||DIRECCIÓN 2" (el asistente lo separa así). */
function marFito(nombre?: string | null, direccion?: string | null): string | undefined {
  if (!nombre) return undefined;
  const lineas = (direccion ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return [nombre.trim(), ...lineas].join('||');
}
