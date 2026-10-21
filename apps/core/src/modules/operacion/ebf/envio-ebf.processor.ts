import { InjectQueue, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { EnvioEbfService } from './envio-ebf.service';

export const ENVIO_EBF_QUEUE = 'envio-ebf';
const CICLO = 'ciclo';
const ID_REPETIDO = 'envio-ebf-ciclo';

/**
 * Ciclo del envío a EBF: cada 15 min. Dentro del horario de EBF relee las
 * coordinaciones activas (y en modo automático envía lo pendiente); fuera del
 * horario solo relee una vez por hora (EBF no cambia de noche y es un
 * servicio externo compartido). `EBF_ENVIO_AUTOSTART=false` lo apaga.
 */
@Processor(ENVIO_EBF_QUEUE)
export class EnvioEbfProcessor implements OnModuleInit {
  private readonly logger = new Logger(EnvioEbfProcessor.name);

  constructor(
    private readonly envio: EnvioEbfService,
    @InjectQueue(ENVIO_EBF_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    if ((process.env.EBF_ENVIO_AUTOSTART || 'true').toLowerCase() === 'false') {
      this.logger.warn('[ebf] ciclo de envío apagado (EBF_ENVIO_AUTOSTART=false)');
      return;
    }
    for (const j of await this.queue.getRepeatableJobs()) {
      if (j.id === ID_REPETIDO) await this.queue.removeRepeatableByKey(j.key);
    }
    await this.queue.add(CICLO, {}, { jobId: ID_REPETIDO, repeat: { every: 15 * 60_000 }, removeOnComplete: 20, removeOnFail: 20 });
    this.logger.log('[ebf] ciclo de envío registrado (cada 15 min)');
  }

  @Process(CICLO)
  async ciclo(_job: Job) {
    const v = this.envio.ventana();
    if (!v.abierta && new Date().getMinutes() >= 15) return { omitido: 'EBF cerrado: se relee una vez por hora' };
    const r = await this.envio.ciclo();
    this.logger.log(`[ebf] ciclo: ${r.leidas} leídas, ${r.enviadas} enviadas, ${r.errores.length} errores`);
    return r;
  }

  @OnQueueFailed()
  fallo(job: Job, err: Error) {
    this.logger.error(`[ebf] ciclo ${job.id} falló: ${err.message}`, err.stack);
  }
}
