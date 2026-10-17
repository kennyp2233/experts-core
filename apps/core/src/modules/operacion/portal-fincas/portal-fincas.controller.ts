import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { ActualizarUsuarioFincaDto, CrearUsuarioFincaDto, DaeFincaDto, LineaFincaDto } from './portal-fincas.dto';
import { PortalFincasService, UsuarioPortal } from './portal-fincas.service';
import { UsuariosFincasService } from './usuarios-fincas.service';

type ConUsuario = { user: UsuarioPortal };

/** Portal de las fincas (rol FINCA). Bajo `/api/v1/portal-fincas`. */
@ApiTags('Portal de fincas')
@ApiBearerAuth()
@Controller({ path: 'portal-fincas', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FINCA)
export class PortalFincasController {
  constructor(private readonly service: PortalFincasService) {}

  @Get('perfil')
  @ApiOperation({ summary: 'Usuario y sus fincas.' })
  perfil(@Req() req: ConUsuario) {
    return this.service.perfil(req.user);
  }

  @Get('guias')
  @ApiOperation({ summary: 'Guías abiertas para cargar (sin cortar, con vuelo de hoy en adelante).' })
  guias(@Req() req: ConUsuario) {
    return this.service.guias(req.user);
  }

  @Get('guias/:id')
  @ApiOperation({ summary: 'Una guía: datos, productos y DAE de sus fincas, y lo que ya cargaron.' })
  guia(@Req() req: ConUsuario, @Param('id', ParseIntPipe) id: number) {
    return this.service.guia(req.user, id);
  }

  @Post('guias/:id/lineas')
  @ApiOperation({ summary: 'Carga una línea (finca, producto, fulls, cajas, kg, DAE…).' })
  agregar(@Req() req: ConUsuario, @Param('id', ParseIntPipe) id: number, @Body() dto: LineaFincaDto) {
    return this.service.agregarLinea(req.user, id, dto);
  }

  @Put('guias/:id/lineas/:idLinea')
  @ApiOperation({ summary: 'Corrige una línea propia mientras la guía está abierta.' })
  cambiar(
    @Req() req: ConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Param('idLinea', ParseIntPipe) idLinea: number,
    @Body() dto: LineaFincaDto,
  ) {
    return this.service.cambiarLinea(req.user, id, idLinea, dto);
  }

  @Delete('guias/:id/lineas/:idLinea')
  @ApiOperation({ summary: 'Borra una línea propia mientras la guía está abierta.' })
  quitar(@Req() req: ConUsuario, @Param('id', ParseIntPipe) id: number, @Param('idLinea', ParseIntPipe) idLinea: number) {
    return this.service.quitarLinea(req.user, id, idLinea);
  }

  @Get('daes')
  @ApiOperation({ summary: 'DAE de sus fincas (vigentes y de los últimos dos meses).' })
  daes(@Req() req: ConUsuario) {
    return this.service.daes(req.user);
  }

  @Get('paises')
  @ApiOperation({ summary: 'Países de destino para registrar una DAE.' })
  paises() {
    return this.service.paises();
  }

  @Post('daes')
  @ApiOperation({ summary: 'Registra una DAE de una de sus fincas.' })
  crearDae(@Req() req: ConUsuario, @Body() dto: DaeFincaDto) {
    return this.service.crearDae(req.user, dto);
  }

  @Delete('daes/:id')
  @ApiOperation({ summary: 'Quita una DAE registrada en el portal.' })
  quitarDae(@Req() req: ConUsuario, @Param('id', ParseIntPipe) id: number) {
    return this.service.quitarDae(req.user, id);
  }
}

/** La oficina administra los usuarios de las fincas. Bajo `/api/v1/operacion/usuarios-fincas`. */
@ApiTags('Operación / Usuarios de fincas')
@ApiBearerAuth()
@Controller({ path: 'operacion/usuarios-fincas', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsuariosFincasController {
  constructor(private readonly service: UsuariosFincasService) {}

  @Get()
  @ApiOperation({ summary: 'Usuarios de finca con sus fincas.' })
  listar() {
    return this.service.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crea un usuario de finca; devuelve la clave (se muestra una sola vez).' })
  crear(@Body() dto: CrearUsuarioFincaDto) {
    return this.service.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cambia nombre, fincas o si está activo.' })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUsuarioFincaDto) {
    return this.service.actualizar(id, dto);
  }

  @Post(':id/clave')
  @ApiOperation({ summary: 'Genera una clave nueva (se muestra una sola vez).' })
  nuevaClave(@Param('id') id: string) {
    return this.service.nuevaClave(id);
  }
}
