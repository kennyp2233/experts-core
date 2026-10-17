import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { ExploradorMaestrosService } from './explorador-maestros.service';
import { EdicionMaestrosService } from './edicion-maestros.service';
import { GuardarMaestroDto } from './dto/guardar-maestro.dto';

type ConUsuario = { user?: { username?: string; email?: string } };
const usuario = (req: ConUsuario) => req.user?.username ?? req.user?.email;

const entero = (v: string | undefined, def: number, max: number) => {
  const n = v ? parseInt(v, 10) : def;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : def;
};

/**
 * Datos maestros bajo `/api/v1/maestros`: lista, ficha y, para las entidades
 * con formulario, alta y cambios (en modo sombra solo lo creado aquí).
 */
@ApiTags('Datos maestros')
@ApiBearerAuth()
@Controller({ path: 'maestros', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class ExploradorMaestrosController {
  constructor(
    private readonly service: ExploradorMaestrosService,
    private readonly edicion: EdicionMaestrosService,
  ) {}

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

  // Antes de ':entidad/:id' para que "formulario" no se tome como id.
  @Get(':entidad/formulario')
  @ApiOperation({ summary: 'Formulario de la entidad: secciones, campos y opciones.' })
  formulario(@Param('entidad') entidad: string) {
    return this.edicion.formulario(entidad);
  }

  @Get(':entidad/:id')
  @ApiOperation({ summary: 'Ficha completa de un registro (con sus relaciones).' })
  ficha(@Param('entidad') entidad: string, @Param('id') id: string) {
    return this.service.ficha(entidad, id);
  }

  @Get(':entidad/:id/edicion')
  @ApiOperation({ summary: 'Valores del registro por campo del formulario y si se puede editar.' })
  valores(@Param('entidad') entidad: string, @Param('id') id: string) {
    return this.edicion.edicion(entidad, id);
  }

  @Post(':entidad')
  @ApiOperation({ summary: 'Crea un registro (queda como creado en el sistema nuevo).' })
  crear(@Param('entidad') entidad: string, @Body() dto: GuardarMaestroDto, @Req() req: ConUsuario) {
    return this.edicion.crear(entidad, dto.valores, usuario(req));
  }

  @Put(':entidad/:id')
  @ApiOperation({ summary: 'Cambia un registro (en modo sombra, solo los creados en el sistema nuevo).' })
  actualizar(@Param('entidad') entidad: string, @Param('id') id: string, @Body() dto: GuardarMaestroDto, @Req() req: ConUsuario) {
    return this.edicion.actualizar(entidad, id, dto.valores, usuario(req));
  }
}
