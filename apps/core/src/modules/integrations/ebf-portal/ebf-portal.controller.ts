import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EbfPortalService } from './ebf-portal.service';
import { CreateCoordinacionDto } from './dto/create-coordinacion.dto';
import { UpdateCoordinacionDto } from './dto/update-coordinacion.dto';
import { BoxWeightDto } from './dto/box-weight.dto';

@ApiTags('Integrations / EBF Portal')
@Controller({ path: 'integrations/ebf-portal', version: '1' })
export class EbfPortalController {
  constructor(private readonly service: EbfPortalService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar que el login al portal EBF funciona' })
  async health() {
    return this.service.ensureSession();
  }

  // ---------- DESPACHO / LISTAS ----------

  @Get('coordinaciones')
  @ApiOperation({ summary: 'Lista de coordinaciones (despacho)' })
  async listCoordinaciones(
    @Query('page') page?: string,
    @Query('sort') sort?: string,
    @Query('historico') historico?: string,
  ) {
    return this.service.coordinacion.list({
      page: page ? parseInt(page, 10) : undefined,
      sort: sort as Parameters<
        typeof this.service.coordinacion.list
      >[0]['sort'],
      includeHistorico: historico === 'true' || historico === '1',
    });
  }

  @Get('coordinaciones/:id')
  @ApiOperation({ summary: 'Detalle crudo de una coordinación (despacho)' })
  async getCoordinacion(@Param('id') id: string) {
    return this.service.coordinacion.getDetalle(id);
  }

  @Put('coordinaciones/:id')
  @ApiOperation({
    summary: 'Actualizar coordinación (STUB — form de edición sin mapear)',
  })
  async updateCoordinacion(
    @Param('id') id: string,
    @Body() dto: UpdateCoordinacionDto,
  ) {
    return this.service.coordinacion.update(id, dto);
  }

  @Get('daes')
  @ApiOperation({ summary: 'Lista de DAEs (scraping, columnas dinámicas)' })
  async listDaes(@Query('page') page?: string) {
    return this.service.dae.list({
      page: page ? parseInt(page, 10) : undefined,
    });
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
    return this.service.create.createCoordinacion(dto);
  }
}
