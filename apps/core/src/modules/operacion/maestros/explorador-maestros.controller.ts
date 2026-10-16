import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { ExploradorMaestrosService } from './explorador-maestros.service';

const entero = (v: string | undefined, def: number, max: number) => {
  const n = v ? parseInt(v, 10) : def;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : def;
};

/** Datos maestros de solo lectura (los manda el sistema viejo). Bajo `/api/v1/maestros`. */
@ApiTags('Datos maestros (solo lectura)')
@ApiBearerAuth()
@Controller({ path: 'maestros', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class ExploradorMaestrosController {
  constructor(private readonly service: ExploradorMaestrosService) {}

  @Get()
  @ApiOperation({ summary: 'Entidades disponibles con su cantidad de registros.' })
  entidades() {
    return this.service.entidades();
  }

  @Get(':entidad')
  @ApiOperation({ summary: 'Lista paginada con búsqueda.' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  listar(
    @Param('entidad') entidad: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listar(entidad, q, entero(page, 1, 100_000), entero(pageSize, 50, 200));
  }

  @Get(':entidad/:id')
  @ApiOperation({ summary: 'Ficha completa de un registro (con sus relaciones).' })
  ficha(@Param('entidad') entidad: string, @Param('id') id: string) {
    return this.service.ficha(entidad, id);
  }
}
