import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EbfPortalService } from './ebf-portal.service';
import { CreateCoordinacionDto } from './dto/create-coordinacion.dto';
import { UpdateCoordinacionDto } from './dto/update-coordinacion.dto';

@ApiTags('Integrations / EBF Portal')
@Controller({ path: 'integrations/ebf-portal', version: '1' })
export class EbfPortalController {
  constructor(private readonly service: EbfPortalService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar que el login al portal EBF funciona' })
  async health() {
    return this.service.ensureSession();
  }

  @Get('coordinaciones')
  @ApiOperation({ summary: 'Lista de coordinaciones (scraping)' })
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
  @ApiOperation({ summary: 'Detalle crudo de una coordinación' })
  async getCoordinacion(@Param('id') id: string) {
    return this.service.coordinacion.getDetalle(id);
  }

  @Post('coordinaciones')
  @ApiOperation({
    summary: 'Crear coordinación en EBF (STUB — pendiente mapear form)',
  })
  async createCoordinacion(@Body() dto: CreateCoordinacionDto) {
    return this.service.coordinacion.create(dto);
  }

  @Put('coordinaciones/:id')
  @ApiOperation({
    summary: 'Actualizar coordinación en EBF (STUB — pendiente mapear form)',
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
}
