import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { CoordinacionesService } from './coordinaciones.service';
import { ListarCoordinacionesDto } from './dto/listar-coordinaciones.dto';
import { CortarCoordinacionDto, GuardarCoordinacionDto } from './dto/guardar-coordinacion.dto';
import { CoordinarService } from './coordinar.service';

type ConUsuario = { user?: { username?: string; email?: string } };
const usuario = (req: ConUsuario) => req.user?.username ?? req.user?.email;

/** Coordinaciones del sistema nuevo. Bajo `/api/v1/operacion/coordinaciones`. */
@ApiTags('Operación / Coordinaciones')
@ApiBearerAuth()
@Controller({ path: 'operacion/coordinaciones', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class CoordinacionesController {
  constructor(
    private readonly service: CoordinacionesService,
    private readonly coordinar: CoordinarService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista paginada con filtros (AWB, guía hija, DAE, estado, fechas, aerolínea…).' })
  listar(@Query() filtros: ListarCoordinacionesDto) {
    return this.service.listar(filtros);
  }

  @Get('parametros')
  @ApiOperation({ summary: 'Defaults para coordinar: valores por línea, rótulos de cargos de agencia y conceptos de la aerolínea.' })
  parametros(@Query('idAerolinea') idAerolinea?: string) {
    const id = Number(idAerolinea);
    return this.coordinar.parametros(Number.isInteger(id) && id > 0 ? id : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle: guías hijas con sus líneas, liquidación, ruta, manifiesto, marcas y medidas.' })
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.detalle(id);
  }

  @Post('simular')
  @ApiOperation({ summary: 'Arma una coordinación sin guardarla: guías hijas, totales, liquidación y advertencias. `?id=` al editar.' })
  simular(@Body() dto: GuardarCoordinacionDto, @Query('id') id?: string) {
    const n = Number(id);
    return this.coordinar.simular(dto, Number.isInteger(n) && n > 0 ? n : undefined);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una coordinación (queda abierta) y marca la guía madre como coordinada.' })
  crear(@Body() dto: GuardarCoordinacionDto, @Req() req: ConUsuario) {
    return this.coordinar.crear(dto, usuario(req));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifica una coordinación abierta (conserva los números de guía hija que siguen).' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: GuardarCoordinacionDto, @Req() req: ConUsuario) {
    return this.coordinar.actualizar(id, dto, usuario(req));
  }

  @Post(':id/corte')
  @ApiOperation({ summary: 'Corte de guía (irreversible): la coordinación queda sin edición.' })
  cortar(@Param('id', ParseIntPipe) id: number, @Body() dto: CortarCoordinacionDto) {
    return this.coordinar.cortar(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Anula una coordinación abierta: borra el detalle y libera la guía madre.' })
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.coordinar.anular(id);
  }
}
