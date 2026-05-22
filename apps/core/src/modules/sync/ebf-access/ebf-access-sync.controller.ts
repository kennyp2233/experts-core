import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EbfAccessSyncService } from './ebf-access-sync.service';

const STATUSES = [
  'SYNCED',
  'ONLY_EBF',
  'MISMATCH',
  'MANUAL_REVIEW',
  'IGNORED',
  'ALL',
] as const;
type StatusFilter = (typeof STATUSES)[number];

/**
 * Endpoints read-only para inspeccionar el estado del sync hub.
 * Manual trigger (POST /run) útil para tests y debugging — corre el ciclo
 * en foreground y devuelve el report directamente (sin pasar por Bull).
 *
 * Bajo `/api/v1/sync/ebf-access/*`.
 */
@ApiTags('Sync / EBF-Access')
@Controller({ path: 'sync/ebf-access', version: '1' })
export class EbfAccessSyncController {
  constructor(private readonly service: EbfAccessSyncService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Conteo de filas en el side-car agrupado por status.',
  })
  async stats() {
    return this.service.getStats();
  }

  @Get('list')
  @ApiOperation({
    summary: 'Lista de filas del side-car. Filtra por status si se pasa.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: STATUSES,
    description: 'Default ALL',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  async list(
    @Query('status') statusParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    const status = (statusParam || 'ALL').toUpperCase() as StatusFilter;
    if (!STATUSES.includes(status)) {
      throw new BadRequestException(
        `status inválido: ${statusParam}. Opciones: ${STATUSES.join(', ')}`,
      );
    }
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    if (!Number.isFinite(limit) || limit < 1 || limit > 1000) {
      throw new BadRequestException('limit debe estar entre 1 y 1000');
    }
    return this.service.listByStatus(status, limit);
  }

  @Post('run')
  @ApiOperation({
    summary:
      'Trigger manual del ciclo de sync (foreground, devuelve el report). Útil para test/debug; el cron corre solo de fondo.',
  })
  async runNow() {
    return this.service.runCycle();
  }
}
