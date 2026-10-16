import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { GuiasMadreService } from './guias-madre.service';
import { ListarGuiasMadreDto } from './dto/listar-guias-madre.dto';
import { GuardarIngresoDto, ListarIngresosDto } from './dto/ingreso-guias.dto';
import { PrestarGuiaDto } from './dto/stock-guias.dto';
import { IngresosGuiasService } from './ingresos-guias.service';
import { StockGuiasService } from './stock-guias.service';

type ConUsuario = { user?: { username?: string; email?: string } };
const usuario = (req: ConUsuario) => req.user?.username ?? req.user?.email;

/**
 * Guías AWB, como el menú Guías del sistema viejo: Ingreso (documentos CGU con
 * los que nace cada guía) y Administración (todas las guías: préstamo,
 * devolución, verificar). Bajo `/api/v1/operacion/guias-madre`.
 */
@ApiTags('Operación / Guías')
@ApiBearerAuth()
@Controller({ path: 'operacion/guias-madre', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class GuiasMadreController {
  constructor(
    private readonly service: GuiasMadreService,
    private readonly stock: StockGuiasService,
    private readonly ingresos: IngresosGuiasService,
  ) {}

  // ---- Ingreso de guías ----

  @Get('ingresos')
  @ApiOperation({ summary: 'Ingresos de guías (documentos CGU) por pestaña, con sus guías y la situación de cada una.' })
  listarIngresos(@Query() filtros: ListarIngresosDto) {
    return this.ingresos.listar(filtros);
  }

  @Get('ingresos/:id')
  @ApiOperation({ summary: 'Detalle del ingreso: cabecera, conteos, guías y si el estado coincide con ellas ("stock verificado").' })
  ingreso(@Param('id', ParseIntPipe) id: number) {
    return this.ingresos.detalle(id);
  }

  @Post('ingresos/previsualizar')
  @ApiOperation({ summary: 'Revisa las guías sin grabar: formato, verificador y si ya están ingresadas (aquí o en el sistema viejo).' })
  previsualizar(@Body() dto: GuardarIngresoDto, @Query('id') id?: string) {
    return this.ingresos.previsualizar(dto, id ? Number(id) : undefined);
  }

  @Post('ingresos')
  @ApiOperation({ summary: 'Graba un ingreso de guías.' })
  crearIngreso(@Body() dto: GuardarIngresoDto, @Req() req: ConUsuario) {
    return this.ingresos.crear(dto, usuario(req));
  }

  @Put('ingresos/:id')
  @ApiOperation({ summary: 'Modifica un ingreso (no quita guías usadas; no se modifica si está cancelado).' })
  actualizarIngreso(@Param('id', ParseIntPipe) id: number, @Body() dto: GuardarIngresoDto, @Req() req: ConUsuario) {
    return this.ingresos.actualizar(id, dto, usuario(req));
  }

  @Delete('ingresos/:id')
  @ApiOperation({ summary: 'Anula un ingreso sin guías usadas.' })
  anularIngreso(@Param('id', ParseIntPipe) id: number, @Req() req: ConUsuario) {
    return this.ingresos.anular(id, usuario(req));
  }

  @Post('ingresos/:id/corregir-estado')
  @ApiOperation({ summary: 'Pone el estado del ingreso que corresponde a sus guías.' })
  corregirEstado(@Param('id', ParseIntPipe) id: number) {
    return this.ingresos.corregirEstado(id);
  }

  // ---- Administración de guías ----

  @Get('resumen')
  @ApiOperation({ summary: 'Guías por aerolínea: libres, coordinadas, prestadas.' })
  resumen() {
    return this.service.resumen();
  }

  @Get()
  @ApiOperation({ summary: 'Guías con filtros (estado, aerolínea, número, virtual). Sin las anuladas.' })
  listar(@Query() filtros: ListarGuiasMadreDto) {
    return this.service.listar(filtros);
  }

  @Post(':id/prestamo')
  @ApiOperation({ summary: 'Marca una guía libre como prestada (la usó otra agencia o no se usa).' })
  prestar(@Param('id', ParseIntPipe) id: number, @Body() dto: PrestarGuiaDto) {
    return this.stock.prestar(id, dto);
  }

  @Delete(':id/prestamo')
  @ApiOperation({ summary: 'Quita el préstamo: la guía vuelve a libre.' })
  quitarPrestamo(@Param('id', ParseIntPipe) id: number) {
    return this.stock.quitarPrestamo(id);
  }

  @Post(':id/devolucion')
  @ApiOperation({ summary: 'Registra la devolución de una guía prestada.' })
  devolver(@Param('id', ParseIntPipe) id: number, @Body() dto: PrestarGuiaDto) {
    return this.stock.devolver(id, dto);
  }

  @Post(':id/verificar')
  @ApiOperation({ summary: 'Verificar estado AWB: coordinada si una coordinación la usa; si no, libre.' })
  verificar(@Param('id', ParseIntPipe) id: number) {
    return this.stock.verificar(id);
  }
}
