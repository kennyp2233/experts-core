import { InjectQueue, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, JobOptions, Queue } from 'bull';
import { GrupoSync, LegacySyncService } from '../legacy-sync.service';
import { ModoSync } from '../engine/sync.types';
import { modoOperacion } from '../../../operacion/comun/modo-operacion';

export const LEGACY_SYNC_QUEUE = 'legacy-access-sync';
const CYCLE_JOB = 'cycle';

interface CycleData {
  grupo: GrupoSync;
  modo?: ModoSync;
  forzar?: boolean;
}

const minutos = (env: string | undefined, def: number, min: number) => {
  const n = parseInt(env || String(def), 10);
  return Number.isFinite(n) && n >= min ? n : def;
};

/**
 * Cron del sync Access → PG. Todo pasa por una sola cola (concurrencia 1), así
 * que nunca corren dos sincronizaciones contra Access a la vez:
 *  - maestros:   cada LEGACY_SYNC_INTERVAL_MIN (60) + forzado diario
 *                LEGACY_SYNC_FORZADO_CRON ("0 3 * * *");
 *  - documentos: incremental cada LEGACY_SYNC_DOCS_INTERVAL_MIN (15) +
 *                completo diario LEGACY_SYNC_DOCS_COMPLETO_CRON ("30 3 * * *");
 *  - al arrancar: maestros al minuto y documentos a los 3 minutos.
 * Los cron son hora de Ecuador. Si el bridge no responde la corrida queda
 * OMITIDO. `LEGACY_SYNC_AUTOSTART=false` lo apaga (dev / tests), y no corre en
 * `OPERACION_MODO=activo`: desde el corte manda el sistema nuevo y el sync
 * pisaría con datos de Access lo que se cambió aquí.
 */
@Processor(LEGACY_SYNC_QUEUE)
export class LegacySyncProcessor implements OnModuleInit {
  private readonly logger = new Logger(LegacySyncProcessor.name);
  private readonly autostart =
    (process.env.LEGACY_SYNC_AUTOSTART || 'true').toLowerCase() !== 'false';

  constructor(
    private readonly service: LegacySyncService,
    @InjectQueue(LEGACY_SYNC_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    if (modoOperacion() === 'activo') {
      // Quita los repeatables que hayan quedado registrados en Redis de antes del corte.
      for (const j of await this.queue.getRepeatableJobs()) await this.queue.removeRepeatableByKey(j.key);
      this.logger.warn('[sync] OPERACION_MODO=activo: el sistema nuevo manda, el sync Access → PG no corre.');
      return;
    }
    if (!this.autostart) {
      this.logger.warn('[sync] autostart desactivado (LEGACY_SYNC_AUTOSTART=false) — solo corre a mano.');
      return;
    }
    const tz = 'America/Guayaquil';
    const programados: Array<{ id: string; data: CycleData; repeat: JobOptions['repeat'] }> = [
      {
        id: 'maestros-incremental',
        data: { grupo: 'maestros' },
        repeat: { every: minutos(process.env.LEGACY_SYNC_INTERVAL_MIN, 60, 5) * 60_000 },
      },
      {
        id: 'maestros-forzado',
        data: { grupo: 'maestros', forzar: true },
        repeat: { cron: process.env.LEGACY_SYNC_FORZADO_CRON || '0 3 * * *', tz },
      },
      {
        id: 'documentos-incremental',
        data: { grupo: 'documentos', modo: 'incremental' },
        repeat: { every: minutos(process.env.LEGACY_SYNC_DOCS_INTERVAL_MIN, 15, 5) * 60_000 },
      },
      {
        id: 'documentos-completo',
        data: { grupo: 'documentos', modo: 'completo' },
        repeat: { cron: process.env.LEGACY_SYNC_DOCS_COMPLETO_CRON || '30 3 * * *', tz },
      },
    ];

    // Limpia los repeatables previos (por si cambió un intervalo o un cron).
    const ids = new Set(programados.map((p) => p.id));
    for (const j of await this.queue.getRepeatableJobs()) {
      if (j.id && ids.has(j.id)) await this.queue.removeRepeatableByKey(j.key);
    }
    for (const p of programados) {
      await this.queue.add(CYCLE_JOB, p.data, { jobId: p.id, repeat: p.repeat, removeOnComplete: 50, removeOnFail: 50 });
    }
    // Primeras corridas al arrancar, sin esperar un intervalo completo.
    await this.queue.add(CYCLE_JOB, { grupo: 'maestros' } satisfies CycleData, { delay: 60_000, removeOnComplete: true, removeOnFail: 20 });
    await this.queue.add(CYCLE_JOB, { grupo: 'documentos', modo: 'incremental' } satisfies CycleData, { delay: 180_000, removeOnComplete: true, removeOnFail: 20 });

    const cuando = (r: JobOptions['repeat']) =>
      r && 'cron' in r ? `"${r.cron}"` : r && 'every' in r ? `cada ${r.every / 60_000} min` : '?';
    this.logger.log(
      `[sync] cron registrado (queue=${LEGACY_SYNC_QUEUE}): ${programados.map((p) => `${p.id} ${cuando(p.repeat)}`).join(', ')}`,
    );
  }

  @Process(CYCLE_JOB)
  async handleCycle(job: Job<CycleData>): Promise<unknown> {
    const { grupo = 'maestros', modo, forzar } = job.data ?? ({} as CycleData);
    if (modoOperacion() === 'activo') return { omitido: 'OPERACION_MODO=activo' };
    this.logger.log(`[sync/${grupo}] corrida programada${modo ? ` ${modo}` : ''}${forzar ? ' (forzada)' : ''} (jobId=${job.id})`);
    const r = await this.service.ejecutar({ origen: 'cron', grupo, modo, forzar });
    return { ejecucionId: r.ejecucionId, estado: r.estado, modo: r.modo, ms: r.ms };
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error): void {
    this.logger.error(`[sync] job ${job.id} falló: ${err.message}`, err.stack);
  }
}
