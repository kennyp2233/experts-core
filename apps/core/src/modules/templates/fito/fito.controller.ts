import { Controller, Post, Body, Get, Param, ParseIntPipe, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { FitoService } from './fito.service';
import { GenerateXmlDto } from './dto/generate-xml.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';

@ApiTags('FITO Generation')
@Controller({ path: 'fito', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FitoController {
    constructor(private readonly service: FitoService) { }

    @Post('generate')
    @ApiOperation({ summary: 'Generate XMLs for given Guide IDs' })
    async generate(@Body() dto: GenerateXmlDto) {
        return this.service.generate(dto);
    }

    @Get('status/:jobId')
    @ApiOperation({ summary: 'Check Job Status' })
    async getStatus(@Param('jobId') jobId: string) {
        return this.service.getStatus(jobId);
    }

    @Get('download/:jobId')
    @ApiOperation({ summary: 'Download XMLs for completed job' })
    async downloadXmls(@Param('jobId') jobId: string, @Res() res: Response) {
        const xmls = await this.service.getJobXmls(jobId);

        if (xmls.length === 0) {
            res.status(404).json({ message: 'No XMLs found for this job' });
            return;
        }

        if (xmls.length === 1) {
            // Single file download
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${xmls[0].filename}"`);
            res.send(xmls[0].xmlContent);
        } else {
            // Multiple files - send as JSON with all XMLs (for simplicity)
            // In production, you'd create a ZIP file
            res.json(xmls.map(x => ({ filename: x.filename, content: x.xmlContent })));
        }
    }

    @Get('xmls/:jobId')
    @ApiOperation({ summary: 'List XMLs for a job' })
    async listJobXmls(@Param('jobId') jobId: string) {
        return this.service.getJobXmls(jobId);
    }

    // --- Sistema nuevo (Postgres): la fuente normal ---

    @Get('sistema/guias')
    @ApiOperation({ summary: 'Coordinaciones del sistema (Postgres) para el FITO, más recientes por fecha de vuelo' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async listGuiasSistema(@Query('limit') limit?: string) {
        const n = Number(limit);
        return this.service.listGuias(Number.isInteger(n) && n > 0 && n <= 500 ? n : undefined);
    }

    @Get('sistema/guias/:id/hijas')
    @ApiOperation({ summary: 'Líneas de una coordinación del sistema (finca, producto, cajas, tallos) para el FITO' })
    async getGuiasHijasSistema(@Param('id', ParseIntPipe) id: number) {
        return this.service.getGuiasHijasSistema(id);
    }

    @Get('sistema/destino/:codigo')
    @ApiOperation({ summary: 'Destino por código IATA (datos maestros del sistema)' })
    async getDestinoSistema(@Param('codigo') codigo: string) {
        return this.service.getDestinoSistema(codigo);
    }

    // --- Access directo (deprecado: respaldo hasta apagar el sistema viejo) ---

    @Get('guias')
    @ApiOperation({ summary: '[Deprecado] Guías leídas directo de Access. Usar /fito/sistema/guias', deprecated: true })
    async listGuias() {
        return this.service.listGuiasInAccess();
    }

    @Get('guias/:docNumero/hijas')
    @ApiOperation({ summary: '[Deprecado] Detalle (guías hijas) leído directo de Access. Usar /fito/sistema/guias/:id/hijas', deprecated: true })
    async getGuiasHijas(@Param('docNumero') docNumero: string) {
        return this.service.getGuiasHijas(parseInt(docNumero, 10));
    }

    @Get('destino/:codigo')
    @ApiOperation({ summary: '[Deprecado] Destino desde PIN_auxDestinos (Access). Usar /fito/sistema/destino/:codigo', deprecated: true })
    async getDestinoByCode(@Param('codigo') codigo: string) {
        return this.service.getDestinoByCode(codigo);
    }

    @Get('mapeos')
    @ApiOperation({
        summary: 'Mapeos recordados proCodigo → codigoAgrocalidad (PG side-car) para los códigos dados',
    })
    @ApiQuery({ name: 'codigos', required: false, type: String, example: 'ROS,GYP' })
    async getMapeos(@Query('codigos') codigos?: string | string[]) {
        return this.service.getMapeos(codigos);
    }

    @Get('mapeos/sugerencias')
    @ApiOperation({
        summary: 'Mapeo recomendado por código: recordado (decisión previa) o sugerido (coincidencia exacta en el catálogo)',
    })
    @ApiQuery({ name: 'codigos', required: false, type: String, example: 'ROSAS,STOCK' })
    async getSugerencias(@Query('codigos') codigos?: string | string[]) {
        return this.service.getSugerencias(codigos);
    }
}

