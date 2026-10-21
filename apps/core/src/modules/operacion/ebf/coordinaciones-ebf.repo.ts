import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { modoOperacion } from '../comun/modo-operacion';

/** Una línea del detalle coordinado, con lo que EBF necesita. */
export interface LineaParaEbf {
  idConsignatario: number;
  idFinca: number;
  finca: string;
  idProducto: number | null;
  producto: string;
  dae: string;
  fulls: number;
  cajas: number;
  /** FB / HB / QB / EB, si la línea lo tiene */
  tipoCaja: string | null;
  numeroGuiaHija: string | null;
}

export interface CoordinacionParaEbf {
  id: number;
  numero: number | null;
  numeroGuia: string | null;
  /** YYYY-MM-DD */
  fechaVuelo: string;
  /** Creada en el sistema nuevo (o ya se cortó con Access): se envía. Si no, solo se compara. */
  enviable: boolean;
  idConsignatario: number | null;
  consignatario: string | null;
  lineas: LineaParaEbf[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Lecturas de PG para el envío a EBF: qué coordinaciones van con EBF (su
 * agencia IATA tiene a EBF como carrier) y su detalle por línea.
 */
@Injectable()
export class CoordinacionesEbfRepo {
  private agencias: { en: number; ids: number[] } | null = null;

  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  /** Agencias IATA cuyo carrier es EBF ("EBF-EBF", "EXPERTS - EBFCARGO", …). */
  async agenciasEbf(): Promise<number[]> {
    if (this.agencias && Date.now() - this.agencias.en < 10 * 60_000) return this.agencias.ids;
    const rows = await this.maestros.agenciaIata.findMany({
      where: { OR: [{ nombreCarrier: { contains: 'EBF', mode: 'insensitive' } }, { alias: { contains: 'EBF', mode: 'insensitive' } }] },
      select: { id: true },
    });
    this.agencias = { en: Date.now(), ids: rows.map((r) => r.id) };
    return this.agencias.ids;
  }

  /** Ids de las coordinaciones con EBF que vuelan entre `desde` y `hasta` (sin anuladas). */
  async idsConEbf(desde: string, hasta: string): Promise<number[]> {
    const agencias = await this.agenciasEbf();
    const rows = await this.db.documentoCoordinacion.findMany({
      where: {
        idAgenciaIata: { in: agencias },
        estadoActual: { not: 'ANULADO' },
        fechaVuelo: { gte: new Date(`${desde}T00:00:00Z`), lte: new Date(`${hasta}T00:00:00Z`) },
      },
      select: { id: true },
      orderBy: [{ fechaVuelo: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => r.id);
  }

  async esDeEbf(idAgenciaIata: number | null): Promise<boolean> {
    return idAgenciaIata !== null && (await this.agenciasEbf()).includes(idAgenciaIata);
  }

  /** La coordinación con sus líneas; null si no existe (p. ej. se anuló) o no va con EBF. */
  async cargar(id: number): Promise<CoordinacionParaEbf | null> {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: { guiaHijas: { include: { detalles: { include: { tipoCaja: true } } } } },
    });
    if (!c || c.estadoActual === 'ANULADO' || !(await this.esDeEbf(c.idAgenciaIata))) return null;

    const detalles = c.guiaHijas.flatMap((g) =>
      g.detalles.map((d) => ({
        d,
        idConsignatario: d.idConsignatario ?? g.idConsignatario ?? c.idConsignatario,
        idFinca: d.idFinca ?? g.idFinca,
        dae: (d.dae ?? g.dae ?? '').trim(),
        numeroGuiaHija: g.numeroGuiaHija,
      })),
    );
    const idsFinca = [...new Set(detalles.map((x) => x.idFinca).filter((x): x is number => x !== null))];
    const idsProducto = [...new Set(detalles.map((x) => x.d.idProducto).filter((x): x is number => x !== null))];
    const [fincas, productos, consignatario] = await Promise.all([
      this.maestros.finca.findMany({ where: { id: { in: idsFinca } }, select: { id: true, tag: true, nombreFinca: true } }),
      this.maestros.producto.findMany({ where: { id: { in: idsProducto } }, select: { id: true, nombre: true } }),
      c.idConsignatario
        ? this.maestros.consignatario.findUnique({ where: { id: c.idConsignatario }, select: { nombre: true } })
        : null,
    ]);
    const nombreFinca = new Map(fincas.map((f) => [f.id, f.tag || f.nombreFinca]));
    const nombreProducto = new Map(productos.map((p) => [p.id, p.nombre]));

    const lineas: LineaParaEbf[] = [];
    for (const x of detalles) {
      if (x.idFinca === null || x.idConsignatario === null) continue;
      lineas.push({
        idConsignatario: x.idConsignatario,
        idFinca: x.idFinca,
        finca: nombreFinca.get(x.idFinca) ?? `Finca ${x.idFinca}`,
        idProducto: x.d.idProducto,
        producto: (x.d.idProducto !== null ? nombreProducto.get(x.d.idProducto) : null) ?? x.d.codigoProducto ?? '—',
        dae: x.dae,
        fulls: x.d.fulls ?? 0,
        cajas: x.d.cantidadCajas,
        tipoCaja: x.d.tipoCaja?.codigo ?? null,
        numeroGuiaHija: x.numeroGuiaHija,
      });
    }
    return {
      id: c.id,
      numero: c.numero ?? c.codigoAccess,
      numeroGuia: c.numeroGuia,
      fechaVuelo: iso(c.fechaVuelo),
      enviable: c.codigoAccess === null || modoOperacion() === 'activo',
      idConsignatario: c.idConsignatario,
      consignatario: consignatario?.nombre ?? null,
      lineas,
    };
  }

  /** Nombres de datos maestros para mostrar equivalencias. */
  async nombres(tipo: 'FINCA' | 'MARCA' | 'PRODUCTO', ids: number[]): Promise<Map<number, string>> {
    if (!ids.length) return new Map();
    if (tipo === 'FINCA') {
      const r = await this.maestros.finca.findMany({ where: { id: { in: ids } }, select: { id: true, tag: true, nombreFinca: true } });
      return new Map(r.map((f) => [f.id, f.tag || f.nombreFinca]));
    }
    if (tipo === 'MARCA') {
      const r = await this.maestros.consignatario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } });
      return new Map(r.map((f) => [f.id, f.nombre]));
    }
    const r = await this.maestros.producto.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } });
    return new Map(r.map((f) => [f.id, f.nombre]));
  }
}
