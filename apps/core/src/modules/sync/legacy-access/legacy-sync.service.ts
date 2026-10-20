import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { modoOperacion } from '../../operacion/comun/modo-operacion';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  Prisma,
  PrismaClient as PrismaMaestros,
} from '@internal/datos-maestros-client';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { LegacyDbService } from '../../integrations/legacy-db/legacy-db.service';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { ENTIDADES_DOCUMENTOS } from './entities/documentos';
import { ENTIDADES_MAESTROS } from './entities/maestros';
import { sincronizarEntidad } from './engine/sync-engine';
import {
  ClienteSync,
  EntidadSync,
  ModoSync,
  ResumenEntidad,
  SyncContext,
} from './engine/sync.types';

export type GrupoSync = 'maestros' | 'documentos';
export const GRUPOS: GrupoSync[] = ['maestros', 'documentos'];

export interface OpcionesSync {
  grupo?: GrupoSync;
  /** documentos: incremental (lo reciente/modificado) o completo. maestros siempre es completo. */
  modo?: ModoSync;
  dryRun?: boolean;
  /** Reescribe todo sin mirar los hashes (corrige ediciones/borrados hechos en PG). */
  forzar?: boolean;
  /** Subconjunto de entidades del grupo a correr (por nombre). Default: todas. */
  entidades?: string[];
  origen: 'cron' | 'manual';
}

export interface ResultadoSync {
  ejecucionId: number | null;
  grupo: GrupoSync;
  modo: ModoSync;
  estado: 'OK' | 'CON_ERRORES' | 'ERROR' | 'OMITIDO';
  motivo?: string;
  dryRun: boolean;
  forzado: boolean;
  ms: number;
  entidades: ResumenEntidad[];
}

/** Cuántos omitidos/errores por entidad se guardan en la bitácora (el resto solo se cuenta). */
const MAX_DETALLE = 50;

/**
 * Sync Access → Postgres del sistema viejo, en dos grupos:
 *  - maestros   → schema datos_maestros (siempre lectura completa);
 *  - documentos → schema documentos (stock de guías + coordinaciones), con
 *    modo incremental (lo reciente o modificado) y completo.
 *
 * Solo lee de Access (SELECT vía `LegacyDbService.queryBridge`), una tabla a
 * la vez, y una corrida a la vez. Si el bridge no responde (la PC con Access
 * está apagada) la corrida se marca OMITIDO. Ver README.md.
 */
@Injectable()
export class LegacySyncService {
  private readonly logger = new Logger(LegacySyncService.name);
  private enCurso = false;

  constructor(
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
    @Inject(PRISMA_DOCUMENTOS) private readonly documentos: PrismaDocumentos,
    private readonly legacy: LegacyDbService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  private definicion(grupo: GrupoSync): {
    entidades: ReadonlyArray<EntidadSync<any, any, any>>;
    cliente: ClienteSync;
  } {
    return grupo === 'maestros'
      ? { entidades: ENTIDADES_MAESTROS, cliente: this.maestros as unknown as ClienteSync }
      : { entidades: ENTIDADES_DOCUMENTOS, cliente: this.documentos as unknown as ClienteSync };
  }

  nombresEntidades(): Record<GrupoSync, string[]> {
    return {
      maestros: ENTIDADES_MAESTROS.map((e) => e.entidad),
      documentos: ENTIDADES_DOCUMENTOS.map((e) => e.entidad),
    };
  }

  /** GET /health del legacy-bridge (derivado de ACCESS_BRIDGE_URL). */
  async bridgeDisponible(): Promise<boolean> {
    const queryUrl =
      this.config.get<string>('ACCESS_BRIDGE_URL') ||
      'http://host.docker.internal:3006/query';
    const healthUrl = queryUrl.replace(/\/query\/?$/, '/health');
    try {
      const { data } = await firstValueFrom(this.http.get(healthUrl, { timeout: 5000 }));
      return (data as { status?: string })?.status === 'ok';
    } catch {
      return false;
    }
  }

  async ejecutar(opts: OpcionesSync): Promise<ResultadoSync> {
    const grupo = opts.grupo ?? 'maestros';
    const dryRun = opts.dryRun ?? false;
    const forzado = opts.forzar ?? false;
    if (modoOperacion() === 'activo' && !dryRun) {
      // Desde el corte manda el sistema nuevo: traer datos de Access pisaría lo que se cambió aquí.
      throw new ConflictException('OPERACION_MODO=activo: el sync Access → PG está apagado (solo dry-run).');
    }
    const t0 = Date.now();
    const { entidades, cliente } = this.definicion(grupo);

    // Sin una corrida buena previa del grupo no hay "desde": incremental → completo.
    const desde = grupo === 'documentos' ? await this.ultimaCorridaBuena(grupo) : null;
    const modo: ModoSync =
      grupo === 'maestros' || opts.modo === 'completo' || !desde ? 'completo' : 'incremental';
    const base = { grupo, modo, dryRun, forzado };

    if (this.enCurso) {
      return { ejecucionId: null, ...base, estado: 'OMITIDO', motivo: 'ya hay una corrida en curso', ms: 0, entidades: [] };
    }

    const nombres = entidades.map((e) => e.entidad);
    const desconocidas = (opts.entidades ?? []).filter((e) => !nombres.includes(e));
    if (desconocidas.length > 0) {
      throw new Error(`Entidades desconocidas en "${grupo}": ${desconocidas.join(', ')}`);
    }

    if (!(await this.bridgeDisponible())) {
      const motivo = 'el legacy-bridge no responde (¿PC con Access apagada?)';
      this.logger.warn(`[sync/${grupo}] omitido: ${motivo}`);
      const ej = await this.maestros.syncLegacyEjecucion.create({
        data: { grupo, modo, estado: 'OMITIDO', dryRun, forzado, origen: opts.origen, error: motivo, finalizadoEn: new Date() },
      });
      return { ejecucionId: ej.id, ...base, estado: 'OMITIDO', motivo, ms: Date.now() - t0, entidades: [] };
    }

    this.enCurso = true;
    const ejecucion = await this.maestros.syncLegacyEjecucion.create({
      data: { grupo, modo, estado: 'EN_CURSO', dryRun, forzado, origen: opts.origen },
    });
    try {
      const ctx: SyncContext = {
        legacy: this.legacy,
        dryRun,
        forzar: forzado,
        modo,
        desde,
        ids: await this.idsConocidos(),
      };
      const ahora = new Date();
      const defs = opts.entidades?.length
        ? entidades.filter((e) => opts.entidades!.includes(e.entidad))
        : entidades;

      const resumenes: ResumenEntidad[] = [];
      for (const def of defs) {
        const r = await sincronizarEntidad(cliente, def, ctx, ahora);
        resumenes.push(r);
        this.logger.log(
          `[sync/${grupo}] ${r.entidad}: leídos=${r.leidos} nuevos=${r.creados} actualizados=${r.actualizados} sinCambios=${r.sinCambios} desactivados=${r.desactivados} omitidos=${r.omitidos.length} errores=${r.errores.length}${r.errorFatal ? ` FATAL=${r.errorFatal}` : ''} (${r.ms} ms)`,
        );
      }

      const conErrores = resumenes.some((r) => r.errorFatal || r.errores.length > 0);
      const estado = conErrores ? 'CON_ERRORES' : 'OK';
      await this.maestros.syncLegacyEjecucion.update({
        where: { id: ejecucion.id },
        data: {
          estado,
          finalizadoEn: new Date(),
          resumen: resumenes.map(recortar) as unknown as Prisma.InputJsonValue,
        },
      });
      return { ejecucionId: ejecucion.id, ...base, estado, ms: Date.now() - t0, entidades: resumenes };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.logger.error(`[sync/${grupo}] falló: ${error}`, e instanceof Error ? e.stack : undefined);
      await this.maestros.syncLegacyEjecucion.update({
        where: { id: ejecucion.id },
        data: { estado: 'ERROR', finalizadoEn: new Date(), error },
      });
      return { ejecucionId: ejecucion.id, ...base, estado: 'ERROR', motivo: error, ms: Date.now() - t0, entidades: [] };
    } finally {
      this.enCurso = false;
    }
  }

  async ejecuciones(limit = 20, grupo?: GrupoSync) {
    return this.maestros.syncLegacyEjecucion.findMany({
      where: grupo ? { grupo } : undefined,
      orderBy: { iniciadoEn: 'desc' },
      take: limit,
    });
  }

  /** Inicio de la última corrida real (no dry-run) que terminó bien o con errores parciales. */
  private async ultimaCorridaBuena(grupo: GrupoSync): Promise<Date | null> {
    const ej = await this.maestros.syncLegacyEjecucion.findFirst({
      where: { grupo, dryRun: false, estado: { in: ['OK', 'CON_ERRORES'] } },
      orderBy: { iniciadoEn: 'desc' },
      select: { iniciadoEn: true },
    });
    return ej?.iniciadoEn ?? null;
  }

  /**
   * ids PG de todo lo sincronizado antes (de ambos schemas) más índices
   * auxiliares, para que cada entidad resuelva sus FKs aunque su entidad padre
   * no se corra (o falle) en esta corrida.
   */
  private async idsConocidos(): Promise<Map<string, Map<string, number>>> {
    const ids = new Map<string, Map<string, number>>();
    const poner = (entidad: string, clave: string, id: number) => {
      let m = ids.get(entidad);
      if (!m) ids.set(entidad, (m = new Map()));
      m.set(clave, id);
    };
    const select = { entidad: true, claveAccess: true, idPg: true } as const;
    const where = { ausenteDesde: null, idPg: { not: null } };
    const regs = [
      ...(await this.maestros.syncLegacyRegistro.findMany({ where, select })),
      ...(await this.documentos.syncLegacyRegistro.findMany({ where, select })),
    ];
    for (const r of regs) {
      const n = Number(r.idPg);
      if (Number.isFinite(n)) poner(r.entidad, r.claveAccess, n);
    }
    // Aerolíneas por código IATA (las rutas de las coordinaciones vienen así).
    const aerolineas = await this.maestros.aerolinea.findMany({
      where: { codigo: { not: null }, codigoAccess: { not: null } },
      select: { id: true, codigo: true },
      orderBy: { codigoAccess: 'asc' },
    });
    for (const a of aerolineas) {
      const k = a.codigo!.trim();
      if (!ids.get('aerolinea:iata')?.has(k)) poner('aerolinea:iata', k, a.id);
    }
    for (const t of await this.documentos.tipoCaja.findMany({ select: { id: true, codigo: true } })) {
      if (t.codigo) poner('tipoCaja', t.codigo, t.id);
    }
    return ids;
  }
}

/** Limita el detalle guardado en la bitácora para que el JSON no crezca sin control. */
function recortar(r: ResumenEntidad) {
  return {
    ...r,
    omitidosTotal: r.omitidos.length,
    erroresTotal: r.errores.length,
    omitidos: r.omitidos.slice(0, MAX_DETALLE),
    errores: r.errores.slice(0, MAX_DETALLE),
  };
}
