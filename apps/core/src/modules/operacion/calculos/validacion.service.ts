import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { REGLAS } from './reglas';
import { CoordinacionCompleta, includeCoordinacionCompleta, ReglaNegocio, ResultadoRegla } from './reglas/tipos';

const LOTE = 300;
const MAX_EJEMPLOS = 25;
const VIGENCIA_MS = 10 * 60 * 1000;

export interface ResumenRegla {
  id: string;
  nombre: string;
  descripcion: string;
  evaluadas: number;
  coinciden: number;
  porcentaje: number | null;
  diferencias: Array<{
    id: number;
    codigoAccess: number | null;
    numeroGuia: string | null;
    esperado: unknown;
    calculado: unknown;
    nota?: string;
  }>;
}

export interface ReporteValidacion {
  generadoEn: string;
  ms: number;
  coordinaciones: number;
  reglas: ResumenRegla[];
}

export interface ValidacionCoordinacion {
  id: number;
  reglas: Array<{ id: string; nombre: string; descripcion: string; resultado: ResultadoRegla | null }>;
}

/**
 * Corre las reglas de negocio del sistema nuevo sobre las coordinaciones que
 * vinieron del sistema viejo y mide cuántas veces el resultado coincide con lo
 * que guardó Access. Es la prueba de que la lógica replicada es la misma.
 */
@Injectable()
export class ValidacionService {
  private readonly logger = new Logger(ValidacionService.name);
  private cache: ReporteValidacion | null = null;
  private enCurso: Promise<ReporteValidacion> | null = null;

  constructor(@Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos) {}

  reglas(): ReglaNegocio[] {
    return REGLAS;
  }

  async reporte(fresco = false): Promise<ReporteValidacion> {
    if (!fresco && this.cache && Date.now() - Date.parse(this.cache.generadoEn) < VIGENCIA_MS) return this.cache;
    // Una sola corrida a la vez: los pedidos simultáneos esperan la misma.
    this.enCurso ??= this.generar().finally(() => (this.enCurso = null));
    this.cache = await this.enCurso;
    return this.cache;
  }

  async deCoordinacion(id: number): Promise<ValidacionCoordinacion> {
    const c = await this.db.documentoCoordinacion.findUnique({ where: { id }, include: includeCoordinacionCompleta });
    if (!c) throw new NotFoundException(`Coordinación ${id} no encontrada`);
    return {
      id,
      reglas: REGLAS.map((r) => ({ id: r.id, nombre: r.nombre, descripcion: r.descripcion, resultado: r.evaluar(c) })),
    };
  }

  private async generar(): Promise<ReporteValidacion> {
    const t0 = Date.now();
    const resumen = new Map<string, ResumenRegla>(
      REGLAS.map((r) => [
        r.id,
        { id: r.id, nombre: r.nombre, descripcion: r.descripcion, evaluadas: 0, coinciden: 0, porcentaje: null, diferencias: [] },
      ]),
    );
    let total = 0;
    let cursor: number | undefined;
    for (;;) {
      const lote: CoordinacionCompleta[] = await this.db.documentoCoordinacion.findMany({
        where: { estadoActual: { not: 'ANULADO' } },
        include: includeCoordinacionCompleta,
        orderBy: { id: 'asc' },
        take: LOTE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (lote.length === 0) break;
      for (const c of lote) {
        total++;
        for (const regla of REGLAS) {
          const r = regla.evaluar(c);
          if (!r) continue;
          const s = resumen.get(regla.id)!;
          s.evaluadas++;
          if (r.ok) s.coinciden++;
          else if (s.diferencias.length < MAX_EJEMPLOS) {
            s.diferencias.push({
              id: c.id,
              codigoAccess: c.codigoAccess,
              numeroGuia: c.numeroGuia,
              esperado: r.esperado,
              calculado: r.calculado,
              nota: r.nota,
            });
          }
        }
      }
      cursor = lote[lote.length - 1].id;
    }
    for (const s of resumen.values()) {
      s.porcentaje = s.evaluadas ? Math.round((s.coinciden / s.evaluadas) * 10_000) / 100 : null;
    }
    const ms = Date.now() - t0;
    this.logger.log(`[validacion] ${total} coordinaciones, ${REGLAS.length} reglas en ${ms} ms`);
    return { generadoEn: new Date().toISOString(), ms, coordinaciones: total, reglas: [...resumen.values()] };
  }
}
