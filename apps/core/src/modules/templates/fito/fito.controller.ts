import { Controller, Post, Body, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
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

    @Get('guias')
    @ApiOperation({ summary: 'List available guides in Access DB' })
    async listGuias() {
        return this.service.listGuiasInAccess();
    }

    @Get('guias/:docNumero/hijas')
    @ApiOperation({ summary: 'Get detail records (Guías Hijas) for a specific Guía Madre' })
    async getGuiasHijas(@Param('docNumero') docNumero: string) {
        return this.service.getGuiasHijas(parseInt(docNumero, 10));
    }

    @Get('destino/:codigo')
    @ApiOperation({ summary: 'Get destination info by code from PIN_auxDestinos' })
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
}

