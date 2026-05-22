import {
  InjectQueue,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { EbfAccessSyncService } from '../ebf-access-sync.service';

export const EBF_SYNC_QUEUE = 'ebf-access-sync';
const CYCLE_JOB = 'cycle';
const REPEAT_JOB_ID = 'ebf-sync-recurring';

/**
 * Worker Bull que corre el ciclo de sync a intervalo configurable.
 * Default cada 15 minutos (EBF_SYNC_INTERVAL_MIN). En cada arranque
 * registra/actualiza el repeatable job — Bull deduplica por `jobId`
 * así que reinicios no acumulan jobs duplicados.
 */
@Processor(EBF_SYNC_QUEUE)
export class EbfAccessSyncProcessor implements OnModuleInit {
  private readonly logger = new Logger(EbfAccessSyncProcessor.name);
  private readonly intervalMin: number;
  private readonly autostart: boolean;

  constructor(
    private readonly syncService: EbfAccessSyncService,
    @InjectQueue(EBF_SYNC_QUEUE) private readonly queue: Queue,
  ) {
    this.intervalMin = parseInt(
      process.env.EBF_SYNC_INTERVAL_MIN || '15',
      10,
    );
    // Permitir desactivar el cron via env (útil en dev / tests)
    this.autostart =
      (process.env.EBF_SYNC_AUTOSTART || 'true').toLowerCase() !== 'false';
  }

  async onModuleInit(): Promise<void> {
    if (!this.autostart) {
      this.logger.warn(
        `[sync] autostart desactivado (EBF_SYNC_AUTOSTART=false) — el cron NO está corriendo. Manual trigger via controller.`,
      );
      return;
    }

    // Limpieza de jobs repeatable viejos (si cambió el interval)
    const existing = await this.queue.getRepeatableJobs();
    for (const j of existing) {
      if (j.id === REPEAT_JOB_ID) {
        await this.queue.removeRepeatableByKey(j.key);
      }
    }
    await this.queue.add(
      CYCLE_JOB,
      {},
      {
        jobId: REPEAT_JOB_ID,
        repeat: { every: this.intervalMin * 60 * 1000 },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );
    this.logger.log(
      `[sync] cron registrado — cada ${this.intervalMin} min (queue=${EBF_SYNC_QUEUE})`,
    );
  }

  @Process(CYCLE_JOB)
  async handleCycle(job: Job): Promise<unknown> {
    this.logger.log(`[sync] running cycle (jobId=${job.id})`);
    return this.syncService.runCycle();
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: unknown): void {
    if (job.name !== CYCLE_JOB) return;
    const r = result as { totals?: { matched?: number; mismatches?: number } };
    this.logger.log(
      `[sync] cycle ${job.id} completed — matched=${r?.totals?.matched ?? '?'} mismatch=${r?.totals?.mismatches ?? '?'}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error): void {
    this.logger.error(
      `[sync] cycle ${job.id} failed: ${err.message}`,
      err.stack,
    );
  }
}
