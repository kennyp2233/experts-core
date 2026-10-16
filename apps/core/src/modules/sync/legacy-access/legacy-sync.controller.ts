import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { GRUPOS, GrupoSync, LegacySyncService } from './legacy-sync.service';

const bool = (v?: string) => v === 'true' || v === '1';

function grupoDe(v?: string): GrupoSync | undefined {
  if (v === undefined || v === '') return undefined;
  if (!GRUPOS.includes(v as GrupoSync)) {
    throw new BadRequestException(`grupo inválido: ${v}. Opciones: ${GRUPOS.join(', ')}`);
  }
  return v as GrupoSync;
}

/**
 * Sync Access → PG del sistema viejo (maestros y documentos). Bajo
 * `/api/v1/sync/legacy-access/*`, solo administradores.
 */
@ApiTags('Sync / Sistema viejo (Access → PG)')
@ApiBearerAuth()
@Controller({ path: 'sync/legacy-access', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LegacySyncController {
  constructor(private readonly service: LegacySyncService) {}

  @Post('run')
  @ApiOperation({
    summary:
      'Corre el sync ahora (en primer plano) y devuelve el resumen. Con dryRun=true no escribe nada.',
  })
  @ApiQuery({ name: 'grupo', required: false, enum: GRUPOS, description: 'Default maestros' })
  @ApiQuery({ name: 'modo', required: false, enum: ['incremental', 'completo'], description: 'Solo documentos. Default incremental' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  @ApiQuery({ name: 'forzar', required: false, type: Boolean, description: 'Reescribe todo sin mirar los hashes' })
  @ApiQuery({ name: 'entidades', required: false, description: 'Lista separada por comas (ver GET entidades). Default: todas.' })
  async run(
    @Query('grupo') grupo?: string,
    @Query('modo') modo?: string,
    @Query('dryRun') dryRun?: string,
    @Query('forzar') forzar?: string,
    @Query('entidades') entidades?: string,
  ) {
    if (modo && modo !== 'incremental' && modo !== 'completo') {
      throw new BadRequestException('modo debe ser incremental o completo');
    }
    try {
      return await this.service.ejecutar({
        origen: 'manual',
        grupo: grupoDe(grupo),
        modo: modo as 'incremental' | 'completo' | undefined,
        dryRun: bool(dryRun),
        forzar: bool(forzar),
        entidades: entidades?.split(',').map((e) => e.trim()).filter(Boolean),
      });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Get('ejecuciones')
  @ApiOperation({ summary: 'Historial de corridas (más recientes primero).' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'grupo', required: false, enum: GRUPOS })
  async ejecuciones(@Query('limit') limitParam?: string, @Query('grupo') grupo?: string) {
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      throw new BadRequestException('limit debe estar entre 1 y 200');
    }
    return this.service.ejecuciones(limit, grupoDe(grupo));
  }

  @Get('entidades')
  @ApiOperation({ summary: 'Entidades que sincroniza cada grupo, en orden de ejecución.' })
  entidades() {
    return this.service.nombresEntidades();
  }
}
