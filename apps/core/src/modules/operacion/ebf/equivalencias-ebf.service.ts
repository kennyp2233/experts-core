import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PrismaClient as PrismaEbf } from '@internal/ebf-portal-sync-client';
import { PRISMA_EBF_PORTAL_SYNC } from '../../sync/ebf-access/prisma/prisma-ebf-portal-sync.provider';
import { EbfPortalService } from '../../integrations/ebf-portal/ebf-portal.service';
import type { SelectOption } from '../../integrations/ebf-portal/types/coordinacion-create.types';
import { FilaEbf, normEbf } from './conciliacion-ebf';
import { CoordinacionesEbfRepo, LineaParaEbf } from './coordinaciones-ebf.repo';
import { LecturaEbfService } from './lectura-ebf.service';

export type TipoEquivalencia = 'FINCA' | 'MARCA' | 'PRODUCTO';
export const TIPOS_EQUIVALENCIA: TipoEquivalencia[] = ['FINCA', 'MARCA', 'PRODUCTO'];

export interface Equivalencia {
  ebfId: number | null;
  ebfNombre: string;
  origen: string;
  confirmada: boolean;
}

export type MapaEquivalencias = Record<TipoEquivalencia, Map<number, Equivalencia>>;

export interface ResultadoAprender {
  coordinaciones: number;
  leidas: number;
  pares: number;
  nuevas: number;
  actualizadas: number;
  /** Lo que el historial dice distinto de una equivalencia confirmada */
  conflictos: Array<{ tipo: TipoEquivalencia; idLocal: number; local: string; confirmada: string; historial: string }>;
  errores: string[];
}

const hoyEcuador = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
const sumarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

/**
 * Equivalencias entre datos maestros y EBF (finca ↔ exportador, marca ↔
 * marcación, producto ↔ producto). Los nombres casi nunca coinciden
 * ("ANDESBLOSSOM" es "MATIZ ROSES" en EBF), así que no se adivinan por nombre:
 * se aprenden de lo que la oficina ya tipeó en EBF (misma guía, misma DAE) y
 * se confirman o corrigen a mano.
 */
@Injectable()
export class EquivalenciasEbfService {
  private readonly logger = new Logger(EquivalenciasEbfService.name);

  constructor(
    @Inject(PRISMA_EBF_PORTAL_SYNC) private readonly ebf: PrismaEbf,
    private readonly repo: CoordinacionesEbfRepo,
    private readonly lectura: LecturaEbfService,
    private readonly portal: EbfPortalService,
  ) {}

  async mapa(): Promise<MapaEquivalencias> {
    const rows = await this.ebf.ebfEquivalencia.findMany();
    const mapa: MapaEquivalencias = { FINCA: new Map(), MARCA: new Map(), PRODUCTO: new Map() };
    for (const r of rows) {
      const t = r.tipo as TipoEquivalencia;
      if (!mapa[t]) continue;
      mapa[t].set(r.idLocal, { ebfId: r.ebfId, ebfNombre: r.ebfNombre, origen: r.origen, confirmada: r.confirmada });
    }
    return mapa;
  }

  async listar(tipo?: TipoEquivalencia) {
    const rows = await this.ebf.ebfEquivalencia.findMany({
      where: tipo ? { tipo } : {},
      orderBy: [{ tipo: 'asc' }, { ebfNombre: 'asc' }],
    });
    const nombres = new Map<string, Map<number, string>>();
    for (const t of TIPOS_EQUIVALENCIA) {
      nombres.set(t, await this.repo.nombres(t, rows.filter((r) => r.tipo === t).map((r) => r.idLocal)));
    }
    return rows.map((r) => ({
      tipo: r.tipo,
      idLocal: r.idLocal,
      local: nombres.get(r.tipo)?.get(r.idLocal) ?? `#${r.idLocal}`,
      ebfId: r.ebfId,
      ebfNombre: r.ebfNombre,
      origen: r.origen,
      vecesVista: r.vecesVista,
      confirmada: r.confirmada,
      confirmadaPor: r.confirmadaPor,
      updatedAt: r.updatedAt,
    }));
  }

  /** Opciones de EBF para enlazar a mano (exportadores, marcaciones; productos: los vistos). */
  async opcionesEbf(tipo: TipoEquivalencia): Promise<SelectOption[]> {
    if (tipo === 'FINCA') return this.portal.selection.listExportadores();
    if (tipo === 'MARCA') return this.portal.selection.listMarcacionesDespacho();
    const rows = await this.ebf.ebfEquivalencia.findMany({ where: { tipo: 'PRODUCTO' }, select: { ebfId: true, ebfNombre: true } });
    const vistos = new Map<string, SelectOption>();
    for (const r of rows) vistos.set(normEbf(r.ebfNombre), { value: r.ebfId ? String(r.ebfId) : '', label: r.ebfNombre });
    return [...vistos.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  /** Enlace a mano (queda confirmado). Si no viene el id de EBF, se busca por nombre. */
  async fijar(tipo: TipoEquivalencia, idLocal: number, ebfNombre: string, ebfId: number | null, usuario?: string) {
    const nombre = ebfNombre.trim();
    if (!nombre) throw new BadRequestException('Falta el nombre en EBF.');
    const id = ebfId ?? (await this.resolverId(tipo, nombre));
    return this.ebf.ebfEquivalencia.upsert({
      where: { tipo_idLocal: { tipo, idLocal } },
      create: { tipo, idLocal, ebfNombre: nombre, ebfId: id, origen: 'MANUAL', confirmada: true, confirmadaPor: usuario ?? null },
      update: { ebfNombre: nombre, ebfId: id, origen: 'MANUAL', confirmada: true, confirmadaPor: usuario ?? null },
    });
  }

  async confirmar(tipo: TipoEquivalencia, idLocal: number, usuario?: string) {
    const r = await this.ebf.ebfEquivalencia.findUnique({ where: { tipo_idLocal: { tipo, idLocal } } });
    if (!r) throw new NotFoundException('No hay equivalencia para confirmar.');
    return this.ebf.ebfEquivalencia.update({
      where: { id: r.id },
      data: { confirmada: true, confirmadaPor: usuario ?? null, ebfId: r.ebfId ?? (await this.resolverId(tipo, r.ebfNombre)) },
    });
  }

  async quitar(tipo: TipoEquivalencia, idLocal: number) {
    await this.ebf.ebfEquivalencia.deleteMany({ where: { tipo, idLocal } });
    return { ok: true };
  }

  /** Guarda el id de EBF de un producto cuando aparece en el formulario de coordinar. */
  async guardarIdProducto(idLocal: number, ebfId: number) {
    await this.ebf.ebfEquivalencia.updateMany({ where: { tipo: 'PRODUCTO', idLocal, ebfId: null }, data: { ebfId } });
  }

  private async resolverId(tipo: TipoEquivalencia, nombre: string): Promise<number | null> {
    if (tipo === 'PRODUCTO') return null;
    try {
      const ops = await this.opcionesEbf(tipo);
      const hit = ops.filter((o) => normEbf(o.label) === normEbf(nombre));
      return hit.length === 1 ? parseInt(hit[0].value, 10) || null : null;
    } catch (err) {
      this.logger.warn(`[ebf] no se pudo resolver el id de ${tipo} «${nombre}»: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Aprende del historial: para cada coordinación con EBF de los últimos
   * `dias` lee lo que la oficina tipeó en EBF y empareja sus guías hijas con
   * las filas por la DAE (la DAE es de una sola finca). Si hay más de una
   * línea con la misma DAE (fincas con el mismo RUC), decide por las cajas.
   * No pisa lo confirmado a mano: si el historial dice otra cosa, lo reporta.
   */
  async aprender(dias = 45): Promise<ResultadoAprender> {
    const hoy = hoyEcuador();
    const ids = await this.repo.idsConEbf(sumarDias(hoy, -dias), hoy);
    const votos = new Map<string, Map<string, number>>();
    const votar = (tipo: TipoEquivalencia, idLocal: number, ebfNombre: string) => {
      const k = `${tipo}|${idLocal}`;
      const m = votos.get(k) ?? new Map<string, number>();
      m.set(ebfNombre, (m.get(ebfNombre) ?? 0) + 1);
      votos.set(k, m);
    };
    const res: ResultadoAprender = { coordinaciones: ids.length, leidas: 0, pares: 0, nuevas: 0, actualizadas: 0, conflictos: [], errores: [] };

    for (const id of ids) {
      const c = await this.repo.cargar(id);
      if (!c || !c.numeroGuia) continue;
      try {
        const l = await this.lectura.leer({ numeroGuia: c.numeroGuia, fechaVuelo: c.fechaVuelo, marca: null, guiaFija: null, hoy });
        if (!l.filas.length) continue;
        res.leidas++;
        for (const par of emparejarPorDae(c.lineas, l.filas)) {
          res.pares++;
          votar('FINCA', par.linea.idFinca, par.fila.exportador);
          votar('MARCA', par.linea.idConsignatario, par.fila.marcacion);
          if (par.linea.idProducto !== null) votar('PRODUCTO', par.linea.idProducto, par.fila.producto);
        }
      } catch (err) {
        res.errores.push(`${c.numeroGuia}: ${(err as Error).message}`);
      }
    }

    const existentes = new Map(
      (await this.ebf.ebfEquivalencia.findMany()).map((r) => [`${r.tipo}|${r.idLocal}`, r]),
    );
    const nombres = new Map<TipoEquivalencia, Map<number, string>>();
    for (const t of TIPOS_EQUIVALENCIA) {
      const idsT = [...votos.keys()].filter((k) => k.startsWith(`${t}|`)).map((k) => Number(k.split('|')[1]));
      nombres.set(t, await this.repo.nombres(t, idsT));
    }
    for (const [k, m] of votos) {
      const [tipo, idStr] = k.split('|') as [TipoEquivalencia, string];
      const idLocal = Number(idStr);
      const [ebfNombre, veces] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      const ex = existentes.get(k);
      if (ex && (ex.confirmada || ex.origen === 'MANUAL')) {
        if (normEbf(ex.ebfNombre) !== normEbf(ebfNombre)) {
          res.conflictos.push({ tipo, idLocal, local: nombres.get(tipo)?.get(idLocal) ?? `#${idLocal}`, confirmada: ex.ebfNombre, historial: ebfNombre });
        } else {
          await this.ebf.ebfEquivalencia.update({ where: { id: ex.id }, data: { vecesVista: veces } });
        }
        continue;
      }
      const mismoNombre = ex && normEbf(ex.ebfNombre) === normEbf(ebfNombre);
      const ebfId = mismoNombre && ex?.ebfId ? ex.ebfId : await this.resolverId(tipo, ebfNombre);
      await this.ebf.ebfEquivalencia.upsert({
        where: { tipo_idLocal: { tipo, idLocal } },
        create: { tipo, idLocal, ebfNombre, ebfId, origen: 'HISTORIAL', vecesVista: veces },
        update: { ebfNombre, ebfId, origen: 'HISTORIAL', vecesVista: veces },
      });
      if (ex) res.actualizadas++;
      else res.nuevas++;
    }
    this.logger.log(
      `[ebf] equivalencias aprendidas: ${res.leidas}/${res.coordinaciones} guías, ${res.pares} pares, ${res.nuevas} nuevas, ${res.actualizadas} actualizadas, ${res.conflictos.length} conflictos`,
    );
    return res;
  }
}

/**
 * Empareja las líneas de una coordinación con las filas que la oficina tipeó
 * en EBF para la misma guía. Agrupa ambas por DAE; dentro de una DAE, si hay
 * una sola de cada lado es el par; si hay varias (fincas con el mismo RUC),
 * se emparejan las que tienen las mismas cajas y fulls, sin ambigüedad.
 */
export function emparejarPorDae(lineas: LineaParaEbf[], filas: FilaEbf[]): Array<{ linea: LineaParaEbf; fila: FilaEbf }> {
  type Grupo<T> = { muestra: T; fulls: number; cajas: number };
  const agrupar = <T>(items: T[], clave: (x: T) => string, fulls: (x: T) => number, cajas: (x: T) => number) => {
    const m = new Map<string, Grupo<T>>();
    for (const x of items) {
      const k = clave(x);
      const g = m.get(k) ?? { muestra: x, fulls: 0, cajas: 0 };
      g.fulls += fulls(x);
      g.cajas += cajas(x);
      m.set(k, g);
    }
    return [...m.values()];
  };
  const nuestras = agrupar(
    lineas.filter((l) => l.cajas > 0 && l.dae),
    (l) => `${l.idConsignatario}|${l.idFinca}|${l.idProducto}|${l.dae}`,
    (l) => l.fulls,
    (l) => l.cajas,
  );
  const deEbf = agrupar(
    filas.filter((f) => f.dae),
    (f) => `${normEbf(f.exportador)}|${normEbf(f.marcacion)}|${normEbf(f.producto)}|${f.dae}`,
    (f) => f.fulls,
    (f) => f.cajas,
  );
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const mismasCajas = (ga: Grupo<LineaParaEbf>, gb: Grupo<FilaEbf>) => r3(gb.fulls) === r3(ga.fulls) && gb.cajas === ga.cajas;
  const pares: Array<{ linea: LineaParaEbf; fila: FilaEbf }> = [];
  const usadasA = new Set<Grupo<LineaParaEbf>>();
  const usadasB = new Set<Grupo<FilaEbf>>();
  const par = (ga: Grupo<LineaParaEbf>, gb: Grupo<FilaEbf>) => {
    pares.push({ linea: ga.muestra, fila: gb.muestra });
    usadasA.add(ga);
    usadasB.add(gb);
  };
  // 1. Por DAE
  const daes = new Set(nuestras.map((g) => g.muestra.dae));
  for (const dae of daes) {
    const a = nuestras.filter((g) => g.muestra.dae === dae);
    const b = deEbf.filter((g) => g.muestra.dae === dae);
    if (!b.length) continue;
    if (a.length === 1 && b.length === 1) {
      par(a[0], b[0]);
      continue;
    }
    for (const ga of a) {
      const iguales = b.filter((gb) => !usadasB.has(gb) && mismasCajas(ga, gb));
      if (iguales.length === 1) par(ga, iguales[0]);
    }
    const restoA = a.filter((g) => !usadasA.has(g));
    const restoB = b.filter((g) => !usadasB.has(g));
    if (restoA.length === 1 && restoB.length === 1) par(restoA[0], restoB[0]);
  }
  // 2. DAE distinta (la finca registró otra en EBF): mismas cajas y nombre parecido, sin ambigüedad
  for (const ga of nuestras.filter((g) => !usadasA.has(g))) {
    const candidatas = deEbf.filter(
      (gb) =>
        !usadasB.has(gb) &&
        mismasCajas(ga, gb) &&
        normEbf(gb.muestra.producto) !== '' &&
        similitudNombres(ga.muestra.finca, gb.muestra.exportador) >= 0.5,
    );
    if (candidatas.length === 1) par(ga, candidatas[0]);
  }
  return pares;
}

/** Palabras en común (de 3 letras o más) sobre el total: "LARTISAN-ROSES S.A.S" ~ "LARTISAN-ROSES S.A.S." = 1. */
export function similitudNombres(a: string, b: string): number {
  const palabras = (s: string) => new Set(normEbf(s).split(/[^A-ZÑ0-9]+/).filter((w) => w.length >= 3));
  const pa = palabras(a);
  const pb = palabras(b);
  if (!pa.size || !pb.size) return 0;
  let comunes = 0;
  for (const w of pa) if (pb.has(w)) comunes++;
  return comunes / Math.min(pa.size, pb.size);
}
