import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { NombresMaestrosService, ref, RefMaestro } from '../maestros/nombres-maestros.service';
import { ListarGuiasMadreDto } from './dto/listar-guias-madre.dto';

export type EstadoGuia = 'INGRESADA' | 'COORDINADA' | 'PRESTADA';

export interface GuiaMadreFila {
  id: number;
  numero: string | null;
  aerolinea: RefMaestro | null;
  estado: EstadoGuia | null;
  virtual: boolean;
  prestada: boolean;
  devuelta: boolean;
  fechaPrestamo: string | null;
  fechaDevolucion: string | null;
  observaciones: string | null;
  lote: { id: number; codigoAccess: number | null; fecha: string | null } | null;
  coordinacion: { id: number; codigoAccess: number | null; fechaVuelo: string } | null;
}

export interface ResumenStockAerolinea {
  aerolinea: RefMaestro | null;
  disponibles: number;
  disponiblesVirtuales: number;
  coordinadas: number;
  prestadas: number;
  total: number;
}

const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Stock de guías AWB (guías madre): las que se ingresaron por lote y su
 * estado (ingresada = disponible, coordinada, prestada / devuelta).
 */
@Injectable()
export class GuiasMadreService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    private readonly nombres: NombresMaestrosService,
  ) {}

  async listar(f: ListarGuiasMadreDto) {
    const page = f.page ?? 1;
    const pageSize = f.pageSize ?? 50;
    const and: Prisma.GuiaMadreWhereInput[] = [];
    if (f.estado) and.push({ estado: f.estado });
    if (f.idAerolinea) and.push({ idAerolinea: f.idAerolinea });
    if (f.virtual !== undefined) and.push({ virtual: f.virtual === 'true' });
    const q = f.q?.replace(/\s+/g, '');
    if (q) and.push({ numero: { contains: q, mode: 'insensitive' } });
    const where: Prisma.GuiaMadreWhereInput = and.length ? { AND: and } : {};

    const [total, filas] = await Promise.all([
      this.db.guiaMadre.count({ where }),
      this.db.guiaMadre.findMany({
        where,
        include: {
          documentoBase: { select: { id: true, codigoAccess: true, fecha: true } },
          documentoCoordinacion: { select: { id: true, codigoAccess: true, fechaVuelo: true } },
        },
        // Disponibles primero (las que se pueden usar), luego por número.
        orderBy: [{ estado: 'asc' }, { prefijo: 'asc' }, { secuencial: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const refs = await this.nombres.resolver({ aerolineas: filas.map((g) => g.idAerolinea) });
    const items: GuiaMadreFila[] = filas.map((g) => ({
      id: g.id,
      numero: g.numero,
      aerolinea: ref(refs.aerolineas, g.idAerolinea),
      estado: g.estado,
      virtual: !!g.virtual,
      prestada: !!g.prestada,
      devuelta: !!g.devolucion,
      fechaPrestamo: dia(g.fechaPrestamo),
      fechaDevolucion: dia(g.fechaDevolucion),
      observaciones: g.observaciones,
      lote: g.documentoBase
        ? { id: g.documentoBase.id, codigoAccess: g.documentoBase.codigoAccess, fecha: dia(g.documentoBase.fecha) }
        : null,
      coordinacion: g.documentoCoordinacion
        ? {
            id: g.documentoCoordinacion.id,
            codigoAccess: g.documentoCoordinacion.codigoAccess,
            fechaVuelo: dia(g.documentoCoordinacion.fechaVuelo)!,
          }
        : null,
    }));
    return { items, total, page, pageSize };
  }

  /** Conteo del stock por aerolínea: cuántas guías hay disponibles para coordinar. */
  async resumen(): Promise<ResumenStockAerolinea[]> {
    const grupos = await this.db.guiaMadre.groupBy({
      by: ['idAerolinea', 'estado', 'virtual'],
      _count: { _all: true },
    });
    const porAerolinea = new Map<number | null, ResumenStockAerolinea>();
    const refs = await this.nombres.resolver({ aerolineas: grupos.map((g) => g.idAerolinea) });
    for (const g of grupos) {
      const k = g.idAerolinea ?? null;
      let r = porAerolinea.get(k);
      if (!r) {
        r = { aerolinea: ref(refs.aerolineas, k), disponibles: 0, disponiblesVirtuales: 0, coordinadas: 0, prestadas: 0, total: 0 };
        porAerolinea.set(k, r);
      }
      const n = g._count._all;
      r.total += n;
      if (g.estado === 'INGRESADA') {
        r.disponibles += n;
        if (g.virtual) r.disponiblesVirtuales += n;
      } else if (g.estado === 'COORDINADA') r.coordinadas += n;
      else if (g.estado === 'PRESTADA') r.prestadas += n;
    }
    return [...porAerolinea.values()].sort(
      (a, b) => b.disponibles - a.disponibles || b.total - a.total,
    );
  }
}
