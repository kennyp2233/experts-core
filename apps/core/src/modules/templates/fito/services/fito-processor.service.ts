import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaClient } from '@prisma/client';
import { LegacyDbService } from './legacy-db.service';
import { XmlGeneratorService } from './xml-generator.service';
import { XmlValidatorService } from './xml-validator.service';
import { GenerateXmlDto } from '../dto/generate-xml.dto';

@Processor('fito-xml')
export class FitoProcessor {
    private readonly logger = new Logger(FitoProcessor.name);

    constructor(
        private legacyDb: LegacyDbService,
        private xmlGenerator: XmlGeneratorService,
        private xmlValidator: XmlValidatorService,
        @Inject('PrismaClientTemplates') private prisma: PrismaClient, // Correct injection token from TemplatesModule
    ) { }

    @Process('generate')
    async handleGeneration(job: Job<{ jobId: string, docNumero: number, config: any }>) {
        const { jobId, docNumero, config } = job.data;
        this.logger.debug(`Processing Guide ${docNumero} for Job ${jobId}...`);

        try {
            await this.updateJobProgress(jobId, 'processing');

            // 1. Get Data
            const guiaData = await this.legacyDb.getGuiaCompleta(docNumero);

            // 2. Generate
            const xmlContent = await this.xmlGenerator.generateXML(guiaData, config);

            // 3. Validate
            const validation = await this.xmlValidator.validateXML(xmlContent);
            if (!validation.valid) {
                throw new Error(`XML Validation Failed: ${validation.errors.join(', ')}`);
            }

            // 4. Save Result (FitoXml)
            const filename = `CFE_${docNumero}_${Date.now()}.xml`;
            await this.prisma.fitoXml.create({
                data: {
                    docNumero,
                    filename,
                    xmlContent,
                    guiaData: JSON.parse(JSON.stringify(guiaData)), // Sanitize
                    status: 'success'
                }
            });

            this.logger.log(`Guide ${docNumero} processed successfully.`);

            // Increment processed count
            await this.incrementJobCount(jobId);

            return { status: 'success', filename };

        } catch (error) {
            this.logger.error(`Failed to process guide ${docNumero}: ${error.message}`);

            // Save failure record
            await this.prisma.fitoXml.create({
                data: {
                    docNumero,
                    filename: `ERROR_${docNumero}`,
                    xmlContent: '',
                    status: 'error',
                    errorMessage: error.message
                }
            });

            // Increment processed count even on error to complete job
            await this.incrementJobCount(jobId);

            throw error; // Let Bull know it failed
        }
    }

    private async updateJobProgress(jobId: string, status: string) {
        await this.prisma.fitoJob.update({
            where: { id: jobId },
            data: { status } // Simple update, logic could be more complex
        });
    }

    private async incrementJobCount(jobId: string) {
        await this.prisma.fitoJob.update({
            where: { id: jobId },
            data: {
                processedCount: { increment: 1 }
            }
        });

        // Check if done
        const job = await this.prisma.fitoJob.findUnique({ where: { id: jobId } });
        if (job && job.processedCount >= job.totalCount) {
            await this.prisma.fitoJob.update({
                where: { id: jobId },
                data: { status: 'completed' }
            });
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: Job) {
        this.logger.debug(`Job ${job.id} completed.`);
    }

    @OnQueueFailed()
    async onFailed(job: Job, err: Error) {
        this.logger.error(`Job ${job.id} failed: ${err.message}`);
    }
}
