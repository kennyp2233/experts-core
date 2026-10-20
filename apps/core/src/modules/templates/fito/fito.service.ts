import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaClient } from '@internal/templates-client';
import { GenerateXmlDto } from './dto/generate-xml.dto';
import { FitoLegacyService } from './services/fito-legacy.service';
import { FitoMapeoService } from './services/fito-mapeo.service';
import { FitoSistemaService } from './services/fito-sistema.service';

@Injectable()
export class FitoService {
    private readonly logger = new Logger(FitoService.name);

    constructor(
        @InjectQueue('fito-xml') private fitoQueue: Queue,
        @Inject('PrismaClientTemplates') private prisma: PrismaClient,
        private legacyDb: FitoLegacyService,
        private sistema: FitoSistemaService,
        private mapeos: FitoMapeoService
    ) { }

    async generate(dto: GenerateXmlDto) {
        // 1. Create Job Record
        const jobRecord = await this.prisma.fitoJob.create({
            data: {
                guiaIds: dto.guias.join(','),
                config: JSON.parse(JSON.stringify(dto)),
                totalCount: dto.guias.length,
                status: 'pending'
            }
        });

        // 2. Add to Bull Queue
        const jobs = dto.guias.map(docNumero => ({
            name: 'generate',
            data: {
                jobId: jobRecord.id,
                docNumero,
                config: dto
            }
        }));

        await this.fitoQueue.addBulk(jobs);

        // 3. Recordar mapeos proCodigo → Agrocalidad (PG, best-effort).
        // Fire-and-forget después de encolar: nunca falla ni demora la generación.
        this.mapeos.remember(dto.productMappings).catch((error) =>
            this.logger.warn(`[FITO-MAPEO] no se pudieron recordar mapeos: ${error?.message ?? error}`),
        );

        return {
            message: 'Generation started',
            jobId: jobRecord.id,
            count: dto.guias.length
        };
    }

    async getStatus(jobId: string) {
        return this.prisma.fitoJob.findUnique({ where: { id: jobId } });
    }

    async getJobXmls(jobId: string) {
        // Get the job to know which docNumeros were processed
        const job = await this.prisma.fitoJob.findUnique({ where: { id: jobId } });
        if (!job) return [];

        const docNumeros = job.guiaIds.split(',').map(n => parseInt(n, 10));

        // XML de este job: mismos números y generados desde que se creó el job
        // (un id del sistema nuevo puede coincidir con un docNumero de Access).
        return this.prisma.fitoXml.findMany({
            where: {
                docNumero: { in: docNumeros },
                status: 'success',
                createdAt: { gte: job.createdAt }
            },
            orderBy: { createdAt: 'desc' },
            take: docNumeros.length
        });
    }

    /** @deprecated Access directo; usar `listGuias` (sistema nuevo). */
    async listGuiasInAccess() {
        return this.legacyDb.listGuias();
    }

    /** @deprecated Access directo; usar `getGuiasHijasSistema`. */
    async getGuiasHijas(docNumero: number) {
        return this.legacyDb.getGuiasHijas(docNumero);
    }

    /** @deprecated Access directo; usar `getDestinoSistema`. */
    async getDestinoByCode(desCodigo: string) {
        return this.legacyDb.getDestinoByCode(desCodigo);
    }

    /** Coordinaciones del sistema nuevo (Postgres), más recientes por fecha de vuelo. */
    async listGuias(limit?: number) {
        return this.sistema.listGuias(limit);
    }

    async getGuiasHijasSistema(id: number) {
        return this.sistema.getGuiasHijas(id);
    }

    async getDestinoSistema(codigo: string) {
        return this.sistema.getDestinoByCode(codigo);
    }

    async getMapeos(codigos?: string | string[]) {
        return this.mapeos.findByCodigos(codigos);
    }

    async getSugerencias(codigos?: string | string[]) {
        return this.mapeos.sugerir(codigos);
    }
}

