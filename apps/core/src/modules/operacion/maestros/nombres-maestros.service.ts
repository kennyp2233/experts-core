import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';

/** Referencia corta a un dato maestro para mostrar en pantalla. */
export interface RefMaestro {
  id: number;
  codigo: string | null;
  nombre: string;
  /** Nombre corto con el que se conoce en el sistema viejo (aerAlias, plaAlias), si es distinto. */
  alias?: string | null;
}

export type MapaRefs = Map<number, RefMaestro>;

export interface IdsPorEntidad {
  aerolineas?: Iterable<number | null | undefined>;
  consignatarios?: Iterable<number | null | undefined>;
  destinos?: Iterable<number | null | undefined>;
  origenes?: Iterable<number | null | undefined>;
  agencias?: Iterable<number | null | undefined>;
  fincas?: Iterable<number | null | undefined>;
  productos?: Iterable<number | null | undefined>;
  tiposEmbarque?: Iterable<number | null | undefined>;
}

export interface RefsMaestros {
  aerolineas: MapaRefs;
  consignatarios: MapaRefs;
  destinos: MapaRefs;
  origenes: MapaRefs;
  agencias: MapaRefs;
  fincas: MapaRefs;
  productos: MapaRefs;
  tiposEmbarque: MapaRefs;
  /** Cliente (embarcador auxiliar) de cada consignatario, por id de consignatario. */
  clientesPorConsignatario: MapaRefs;
}

/** Alias solo si aporta (en muchas fichas es igual al nombre). */
const aliasDe = (alias: string | null | undefined, nombre: string) => {
  const a = alias?.trim();
  return a && a.toUpperCase() !== nombre.trim().toUpperCase() ? a : null;
};

const limpio = (ids?: Iterable<number | null | undefined>) =>
  [...new Set([...(ids ?? [])].filter((n): n is number => typeof n === 'number' && n > 0))];

const mapa = (rows: RefMaestro[]): MapaRefs => new Map(rows.map((r) => [r.id, r]));

/**
 * Los documentos (schema `documentos`) guardan FKs lógicas a datos maestros
 * (otro schema). Este servicio resuelve en lote los nombres a mostrar, con una
 * consulta por entidad.
 */
@Injectable()
export class NombresMaestrosService {
  constructor(@Inject('PrismaClientDatosMaestros') private readonly db: PrismaMaestros) {}

  /**
   * Para buscar coordinaciones por nombre: consignatarios cuyo nombre o alias
   * (o el de su cliente) contiene el texto, y fincas por nombre, alias o RUC.
   */
  async buscarPorNombre(texto: string, limite = 300): Promise<{ consignatarios: number[]; fincas: number[] }> {
    const ins = { contains: texto, mode: 'insensitive' as const };
    const [consignatarios, fincas] = await Promise.all([
      this.db.consignatario.findMany({
        where: { OR: [{ nombre: ins }, { alias: ins }, { cliente: { OR: [{ nombre: ins }, { alias: ins }] } }] },
        select: { id: true },
        take: limite,
      }),
      this.db.finca.findMany({
        where: { OR: [{ nombreFinca: ins }, { tag: ins }, { rucFinca: ins }] },
        select: { id: true },
        take: limite,
      }),
    ]);
    return { consignatarios: consignatarios.map((c) => c.id), fincas: fincas.map((f) => f.id) };
  }

  async resolver(ids: IdsPorEntidad): Promise<RefsMaestros> {
    const [aerolineas, consignatarios, destinos, origenes, agencias, fincas, productos, tiposEmbarque] =
      await Promise.all([
        this.db.aerolinea
          .findMany({
            where: { id: { in: limpio(ids.aerolineas) } },
            select: { id: true, codigo: true, nombre: true, alias: true },
          })
          .then((r) => mapa(r.map((a) => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, alias: aliasDe(a.alias, a.nombre) })))),
        this.db.consignatario
          .findMany({
            where: { id: { in: limpio(ids.consignatarios) } },
            select: {
              id: true,
              nombre: true,
              alias: true,
              codigoAccess: true,
              cliente: { select: { id: true, nombre: true, alias: true } },
            },
          }),
        this.db.destino
          .findMany({ where: { id: { in: limpio(ids.destinos) } }, select: { id: true, codigo: true, nombre: true } })
          .then((r) => mapa(r.map((d) => ({ id: d.id, codigo: d.codigo, nombre: d.nombre ?? d.codigo ?? '' })))),
        this.db.origen
          .findMany({ where: { id: { in: limpio(ids.origenes) } }, select: { id: true, codigo: true, nombre: true } })
          .then(mapa),
        this.db.agenciaIata
          .findMany({
            where: { id: { in: limpio(ids.agencias) } },
            select: { id: true, alias: true, nombreShipper: true },
          })
          .then((r) => mapa(r.map((a) => ({ id: a.id, codigo: a.alias, nombre: a.nombreShipper })))),
        this.db.finca
          .findMany({
            where: { id: { in: limpio(ids.fincas) } },
            select: { id: true, nombreFinca: true, rucFinca: true, tag: true },
          })
          .then((r) =>
            mapa(r.map((f) => ({ id: f.id, codigo: f.rucFinca, nombre: f.nombreFinca, alias: aliasDe(f.tag, f.nombreFinca) }))),
          ),
        this.db.producto
          .findMany({ where: { id: { in: limpio(ids.productos) } }, select: { id: true, codigo: true, nombre: true } })
          .then(mapa),
        this.db.tipoEmbarque
          .findMany({ where: { id: { in: limpio(ids.tiposEmbarque) } }, select: { id: true, codigo: true, nombre: true } })
          .then(mapa),
      ]);
    return {
      aerolineas,
      consignatarios: mapa(consignatarios.map((c) => ({ id: c.id, codigo: c.alias, nombre: c.nombre }))),
      destinos,
      origenes,
      agencias,
      fincas,
      productos,
      tiposEmbarque,
      clientesPorConsignatario: new Map(
        consignatarios
          .filter((c) => c.cliente)
          .map((c) => [c.id, { id: c.cliente!.id, codigo: null, nombre: c.cliente!.alias?.trim() || c.cliente!.nombre }]),
      ),
    };
  }
}

/** Busca una referencia en un mapa (null si no hay id o no existe). */
export const ref = (m: MapaRefs, id: number | null | undefined): RefMaestro | null =>
  id ? (m.get(id) ?? null) : null;
