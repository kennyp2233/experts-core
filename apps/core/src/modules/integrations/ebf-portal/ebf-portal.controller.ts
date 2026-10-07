import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { EbfPortalService } from './ebf-portal.service';
import {
  EbfListCacheService,
  parseFreshFlag,
} from './cache/ebf-list-cache.service';
import { CreateCoordinacionDto } from './dto/create-coordinacion.dto';
import { UpdateCoordinacionDto } from './dto/update-coordinacion.dto';
import { BoxWeightDto } from './dto/box-weight.dto';

const FRESH_QUERY_DOC = {
  name: 'fresh',
  required: false,
  type: Boolean,
  description:
    'true → ignora la cache (TTL 120 s), consulta el portal en vivo y repuebla la cache.',
} as const;

/** Requiere sesión (JWT cookie), cualquier rol. */
@ApiTags('Integrations / EBF Portal')
@Controller({ path: 'integrations/ebf-portal', version: '1' })
@UseGuards(JwtAuthGuard)
export class EbfPortalController {
  constructor(
    private readonly service: EbfPortalService,
    private readonly cache: EbfListCacheService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar que el login al portal EBF funciona' })
  async health() {
    return this.service.ensureSession();
  }

  // ---------- DESPACHO / LISTAS ----------

  @Get('coordinaciones')
  @ApiOperation({
    summary: 'Lista de coordinaciones (despacho). Cacheada 120 s salvo ?fresh=true.',
  })
  @ApiQuery(FRESH_QUERY_DOC)
  async listCoordinaciones(
    @Query('page') page?: string,
    @Query('sort') sort?: string,
    @Query('historico') historico?: string,
    @Query('fresh') fresh?: string,
  ) {
    const query = {
      page: page ? parseInt(page, 10) : undefined,
      sort: sort as Parameters<
        typeof this.service.coordinacion.list
      >[0]['sort'],
      includeHistorico: historico === 'true' || historico === '1',
    };
    return this.cache.getOrFetch(
      'coordinaciones',
      {
        historico: query.includeHistorico,
        page: query.page ?? 1,
        sort: query.sort,
      },
      () => this.service.coordinacion.list(query),
      { fresh: parseFreshFlag(fresh) },
    );
  }

  @Get('coordinaciones/:id')
  @ApiOperation({ summary: 'Detalle crudo de una coordinación (despacho)' })
  async getCoordinacion(@Param('id') id: string) {
    return this.service.coordinacion.getDetalle(id);
  }

  @Get('daes')
  @ApiOperation({
    summary: 'Lista de DAEs (scraping, columnas dinámicas). Cacheada 120 s salvo ?fresh=true.',
  })
  @ApiQuery(FRESH_QUERY_DOC)
  async listDaes(
    @Query('page') page?: string,
    @Query('fresh') fresh?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    return this.cache.getOrFetch(
      'daes',
      { page: pageNum ?? 1 },
      () => this.service.dae.list({ page: pageNum }),
      { fresh: parseFreshFlag(fresh) },
    );
  }

  // ---------- COORDINAR (página /exportador/detalle_coordinacion/) ----------

  @Get('coordinar/exportadores')
  @ApiOperation({
    summary: 'Exportadores disponibles para coordinar (parseado del select).',
  })
  async listExportadores() {
    return this.service.selection.listExportadores();
  }

  @Get('coordinar/marcaciones')
  @ApiOperation({ summary: 'Marcaciones / consignatarios de un exportador.' })
  @ApiQuery({ name: 'exportador', type: Number })
  async listMarcaciones(
    @Query('exportador', ParseIntPipe) exportador: number,
  ) {
    return this.service.selection.listMarcaciones(exportador);
  }

  @Get('coordinar/vuelos')
  @ApiOperation({
    summary: 'Vuelos (doc_coordinacion) disponibles para un exportador+marcación.',
  })
  @ApiQuery({ name: 'exportador', type: Number })
  @ApiQuery({ name: 'marcacion', type: Number })
  async listVuelos(
    @Query('exportador', ParseIntPipe) exportador: number,
    @Query('marcacion', ParseIntPipe) marcacion: number,
  ) {
    return this.service.selection.listVuelos(exportador, marcacion);
  }

  @Get('coordinar/daes')
  @ApiOperation({
    summary: 'DAEs disponibles para un exportador+marcación+vuelo.',
  })
  @ApiQuery({ name: 'exportador', type: Number })
  @ApiQuery({ name: 'marcacion', type: Number })
  @ApiQuery({ name: 'vuelo', type: Number })
  async listDaesCoordinar(
    @Query('exportador', ParseIntPipe) exportador: number,
    @Query('marcacion', ParseIntPipe) marcacion: number,
    @Query('vuelo', ParseIntPipe) vuelo: number,
  ) {
    return this.service.selection.listDaes(exportador, marcacion, vuelo);
  }

  @Get('coordinar/vuelo-card')
  @ApiOperation({
    summary: 'Card resumen del vuelo (exportador, cliente, fecha, ruta, aerolínea).',
  })
  @ApiQuery({ name: 'exportador', type: Number })
  @ApiQuery({ name: 'marcacion', type: Number })
  @ApiQuery({ name: 'vuelo', type: Number })
  @ApiQuery({ name: 'dae', type: Number, required: false })
  async getVueloCard(
    @Query('exportador', ParseIntPipe) exportador: number,
    @Query('marcacion', ParseIntPipe) marcacion: number,
    @Query('vuelo', ParseIntPipe) vuelo: number,
    @Query('dae') dae?: string,
  ) {
    return this.service.selection.getVueloCard({
      exportadorId: exportador,
      marcacionId: marcacion,
      vueloId: vuelo,
      daeId: dae ? parseInt(dae, 10) : undefined,
    });
  }

  @Get('coordinar/form')
  @ApiOperation({
    summary:
      'Spec parseada del modal "Crear Detalle De Coordinación" (productos + flags + formset).',
  })
  @ApiQuery({ name: 'exportador', type: Number })
  @ApiQuery({ name: 'marcacion', type: Number })
  @ApiQuery({ name: 'vuelo', type: Number })
  @ApiQuery({ name: 'dae', type: Number })
  async getCreateForm(
    @Query('exportador', ParseIntPipe) exportador: number,
    @Query('marcacion', ParseIntPipe) marcacion: number,
    @Query('vuelo', ParseIntPipe) vuelo: number,
    @Query('dae', ParseIntPipe) dae: number,
  ) {
    return this.service.create.getCreateForm({
      exportadorId: exportador,
      marcacionId: marcacion,
      vueloId: vuelo,
      daeId: dae,
    });
  }

  @Post('coordinar/box-weight')
  @ApiOperation({
    summary: 'Calcula bxs_coo/pcs_coo desde fb/hb/qb/eb (delega en el portal).',
  })
  async calculateBoxWeight(@Body() input: BoxWeightDto) {
    return this.service.create.calculateBoxWeight(input);
  }

  @Post('coordinar')
  @ApiOperation({
    summary:
      'Crea un detalle de coordinación en EBF (write — requiere ventana operativa).',
  })
  async createCoordinacion(@Body() dto: CreateCoordinacionDto) {
    return this.invalidatingCoordinaciones(() =>
      this.service.create.createCoordinacion(dto),
    );
  }

  // ---------- UPDATE / DELETE sobre coordinación existente ----------

  @Get('coordinar/:detalleId/edit-form')
  @ApiOperation({
    summary:
      'Modal de edición parseado para un detalleId. Read-only — no requiere ventana.',
  })
  async getEditForm(@Param('detalleId', ParseIntPipe) detalleId: number) {
    return this.service.update.getUpdateForm(detalleId);
  }

  @Patch('coordinar/:detalleId')
  @ApiOperation({
    summary:
      'Actualiza una coordinación existente (write — requiere ventana operativa).',
  })
  async updateCoordinar(
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: UpdateCoordinacionDto,
  ) {
    return this.invalidatingCoordinaciones(() =>
      this.service.update.updateCoordinacion(detalleId, dto),
    );
  }

  @Delete('coordinar/:detalleId')
  @ApiOperation({
    summary:
      'Elimina una coordinación existente (write — requiere ventana operativa, irreversible).',
  })
  async deleteCoordinar(
    @Param('detalleId', ParseIntPipe) detalleId: number,
  ) {
    return this.invalidatingCoordinaciones(() =>
      this.service.update.deleteCoordinacion(detalleId),
    );
  }

  /**
   * Ejecuta un write al portal e invalida la cache de listas de
   * coordinaciones (vigentes + histórico) haya salido bien o no: un write
   * fallido a mitad de camino también puede haber cambiado el portal.
   * `invalidate` nunca lanza, así que no tapa el error original.
   */
  private async invalidatingCoordinaciones<T>(op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } finally {
      await this.cache.invalidate('coordinaciones');
    }
  }
}
