import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaClient } from '@internal/templates-client';
import { GenerateXmlDto } from './dto/generate-xml.dto';
import { LegacyDbService } from './services/legacy-db.service';

@Injectable()
export class FitoService {
    private readonly logger = new Logger(FitoService.name);

    constructor(
        @InjectQueue('fito-xml') private fitoQueue: Queue,
        @Inject('PrismaClientTemplates') private prisma: PrismaClient,
        private legacyDb: LegacyDbService
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

        // Get XMLs generated for these docNumeros (most recent ones)
        return this.prisma.fitoXml.findMany({
            where: {
                docNumero: { in: docNumeros },
                status: 'success'
            },
            orderBy: { createdAt: 'desc' },
            take: docNumeros.length
        });
    }

    async listGuiasInAccess() {
        return this.legacyDb.listGuias();
    }

    async getGuiasHijas(docNumero: number) {
        return this.legacyDb.getGuiasHijas(docNumero);
    }

    async getDestinoByCode(desCodigo: string) {
        return this.legacyDb.getDestinoByCode(desCodigo);
    }
}

