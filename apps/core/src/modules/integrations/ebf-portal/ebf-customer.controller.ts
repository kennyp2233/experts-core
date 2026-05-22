import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { EbfPortalService } from './ebf-portal.service';
import type { BinaryDownload } from './services/customer-awb.service';

/**
 * Endpoints del rol cliente del portal EBF. Namespace `/customer/*` —
 * separado del controller manager para evitar que un archivo crezca >250
 * líneas. Los endpoints que descargan archivos usan `@Res()` passthrough
 * para escribir headers binarios sin re-procesar.
 */
@ApiTags('Integrations / EBF Portal (Customer)')
@Controller({
  path: 'integrations/ebf-portal/customer',
  version: '1',
})
export class EbfCustomerController {
  constructor(private readonly service: EbfPortalService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar login del rol cliente al portal EBF.' })
  async health() {
    return this.service.ensureCustomerSession();
  }

  @Get('awbs')
  @ApiOperation({
    summary:
      'Lista AWBs del cliente. ETD start/end son obligatorios (YYYY-MM-DD).',
  })
  @ApiQuery({ name: 'etdStart', type: String, example: '2026-05-01' })
  @ApiQuery({ name: 'etdEnd', type: String, example: '2026-05-31' })
  @ApiQuery({ name: 'aerolinea', type: String, required: false })
  @ApiQuery({ name: 'consignatarios', type: Number, required: false })
  @ApiQuery({ name: 'awb', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  async list(
    @Query('etdStart') etdStart: string,
    @Query('etdEnd') etdEnd: string,
    @Query('aerolinea') aerolinea?: string,
    @Query('consignatarios') consignatarios?: string,
    @Query('awb') awb?: string,
    @Query('page') page?: string,
    @Query('sort') sort?: string,
  ) {
    return this.service.customer.list({
      etdStart,
      etdEnd,
      aerolinea,
      consignatarios: consignatarios ? parseInt(consignatarios, 10) : undefined,
      awb,
      page: page ? parseInt(page, 10) : undefined,
      sort,
    });
  }

  @Get('awbs/:id')
  @ApiOperation({ summary: 'Header card del detalle del AWB.' })
  async getHeader(@Param('id', ParseIntPipe) id: number) {
    return this.service.customer.getHeader(id);
  }

  @Get('awbs/:id/details')
  @ApiOperation({
    summary:
      'Tab INFO — filtros (consignatario_marcacion/truck/shipper/only_daily_coo) + HTML raw de las tablas por consignee.',
  })
  @ApiQuery({ name: 'consignatarioMarcacion', type: Number, required: false })
  @ApiQuery({ name: 'truck', type: Number, required: false })
  @ApiQuery({ name: 'shipper', type: Number, required: false })
  @ApiQuery({ name: 'onlyDailyCoo', type: Boolean, required: false })
  async getDetails(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Query('consignatarioMarcacion') consignatarioMarcacion?: string,
    @Query('truck') truck?: string,
    @Query('shipper') shipper?: string,
    @Query('onlyDailyCoo') onlyDailyCoo?: string,
  ) {
    return this.service.customer.getDetails(
      id,
      {
        consignatarioMarcacion: consignatarioMarcacion
          ? parseInt(consignatarioMarcacion, 10)
          : undefined,
        truck: truck ? parseInt(truck, 10) : undefined,
        shipper: shipper ? parseInt(shipper, 10) : undefined,
        onlyDailyCoo:
          onlyDailyCoo == null ? undefined : onlyDailyCoo === 'true',
      },
      this.absoluteUrl(req, `awbs/${id}/export`),
    );
  }

  @Get('awbs/:id/customers')
  @ApiOperation({ summary: 'Tab CUSTOMERS — resumen por consignee.' })
  @ApiQuery({
    name: 'sort',
    type: String,
    required: false,
    description:
      'alias | truck | total_bxs_coo | total_pcs_coo | bxs_cierre | pcs_cierre',
  })
  async getCustomers(
    @Param('id', ParseIntPipe) id: number,
    @Query('sort') sort?: string,
  ) {
    return this.service.customer.getCustomers(id, sort);
  }

  @Get('awbs/:id/documents')
  @ApiOperation({
    summary:
      'Tab DOCUMENTS — lista de archivos del AWB con URLs proxy de descarga.',
  })
  async getDocuments(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const base = this.absoluteUrl(req, '');
    return this.service.customer.getDocuments(
      id,
      (portalUrl) => {
        // portalUrl = /media/docs_coordinacion/<filename>
        const filename = portalUrl.split('/').pop() ?? '';
        return `${base}documents/download?file=${encodeURIComponent(filename)}`;
      },
      () => `${base}awbs/${id}/documents/download-all`,
    );
  }

  @Get('awbs/:id/export')
  @ApiOperation({
    summary:
      'Export XLSX del tab INFO (proxy del `?_export=xlsx` del portal). Mantiene los mismos filtros.',
  })
  async exportXlsx(
    @Res({ passthrough: true }) res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Query('consignatarioMarcacion') consignatarioMarcacion?: string,
    @Query('truck') truck?: string,
    @Query('shipper') shipper?: string,
    @Query('onlyDailyCoo') onlyDailyCoo?: string,
  ): Promise<Buffer> {
    const download = await this.service.customer.exportDetailsXlsx(id, {
      consignatarioMarcacion: consignatarioMarcacion
        ? parseInt(consignatarioMarcacion, 10)
        : undefined,
      truck: truck ? parseInt(truck, 10) : undefined,
      shipper: shipper ? parseInt(shipper, 10) : undefined,
      onlyDailyCoo: onlyDailyCoo == null ? undefined : onlyDailyCoo === 'true',
    });
    this.writeDownloadHeaders(res, download);
    return download.body;
  }

  @Get('awbs/:id/documents/download-all')
  @ApiOperation({ summary: 'Bulk download (zip) de todos los docs del AWB.' })
  async downloadAll(
    @Res({ passthrough: true }) res: Response,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Buffer> {
    const download = await this.service.customer.downloadAllDocuments(id);
    this.writeDownloadHeaders(res, download);
    return download.body;
  }

  @Get('documents/download')
  @ApiOperation({
    summary:
      'Descarga un archivo individual de `/media/docs_coordinacion/` por filename.',
  })
  @ApiQuery({ name: 'file', type: String })
  async downloadDocument(
    @Res({ passthrough: true }) res: Response,
    @Query('file') file: string,
  ): Promise<Buffer> {
    const download = await this.service.customer.downloadDocument(file);
    this.writeDownloadHeaders(res, download);
    return download.body;
  }

  @Get('profile/:clienteId')
  @ApiOperation({ summary: 'Perfil del cliente (modal del portal).' })
  async getProfile(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.service.customer.getProfile(clienteId);
  }

  private writeDownloadHeaders(res: Response, dl: BinaryDownload): void {
    res.setHeader('Content-Type', dl.contentType);
    res.setHeader('Content-Length', String(dl.body.length));
    if (dl.fileName) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${dl.fileName.replace(/"/g, '')}"`,
      );
    }
  }

  /**
   * Construye URL relativa al namespace customer (`/<api>/v<N>/integrations/
   * ebf-portal/customer/<suffix>`) derivada de la request actual — así no
   * hardcodeamos `API_PREFIX` ni la versión. El front resuelve la URL
   * contra su origin habitual.
   */
  private absoluteUrl(req: Request, suffix: string): string {
    const url = req.originalUrl ?? req.url ?? '';
    const idx = url.indexOf('/customer/');
    const basePath =
      idx >= 0
        ? url.slice(0, idx + '/customer/'.length)
        : '/api/v1/integrations/ebf-portal/customer/';
    return `${basePath}${suffix}`;
  }
}
