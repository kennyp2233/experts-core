import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { CoordinacionesService } from './coordinaciones.service';
import { ListarCoordinacionesDto } from './dto/listar-coordinaciones.dto';
import { GuardarCoordinacionDto } from './dto/guardar-coordinacion.dto';
import { CoordinarService } from './coordinar.service';
import { FlowerCargoService } from '../documentos/flowercargo.service';
import { ArchivoReporte, ReportesDiaService } from '../documentos/reportes-dia.service';

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
    private readonly archivoFlowerCargo: FlowerCargoService,
    private readonly reportes: ReportesDiaService,
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

  @Get('reportes/programacion')
  @ApiOperation({ summary: 'Excel "Programación de vuelo" de un día (como el botón de la lista vieja). `?dia=AAAA-MM-DD&idAerolinea=`' })
  async programacion(@Query('dia') dia: string, @Res() res: Response, @Query('idAerolinea') idAerolinea?: string) {
    this.enviar(res, await this.reportes.programacion(dia, Number(idAerolinea) || undefined));
  }

  @Get('reportes/antinarcoticos')
  @ApiOperation({ summary: 'Excel "Reporte Antinarcóticos" de un día: una fila por finca de cada guía. `?dia=AAAA-MM-DD&idAerolinea=`' })
  async antinarcoticos(@Query('dia') dia: string, @Res() res: Response, @Query('idAerolinea') idAerolinea?: string) {
    this.enviar(res, await this.reportes.antinarcoticos(dia, Number(idAerolinea) || undefined));
  }

  private enviar(res: Response, a: ArchivoReporte) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${a.nombreArchivo}"`);
    res.send(a.contenido);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle: guías hijas con sus líneas, liquidación, ruta, manifiesto, marcas y medidas.' })
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.detalle(id);
  }

  @Get(':id/flowercargo')
  @ApiOperation({ summary: 'Vista previa del archivo de manifiesto para FlowerCargo (filas y advertencias).' })
  async vistaFlowerCargo(@Param('id', ParseIntPipe) id: number) {
    const { texto: _t, ...vista } = await this.archivoFlowerCargo.generar(id);
    return vista;
  }

  @Get(':id/flowercargo.txt')
  @ApiOperation({ summary: 'Descarga el archivo de manifiesto para FlowerCargo (tabs, CRLF, ASCII).' })
  async flowerCargoTxt(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const a = await this.archivoFlowerCargo.generar(id);
    res.setHeader('Content-Type', 'text/plain; charset=us-ascii');
    res.setHeader('Content-Disposition', `attachment; filename="${a.nombreArchivo}"`);
    return a.texto;
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
  cortar(@Param('id', ParseIntPipe) id: number) {
    return this.coordinar.cortar(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Anula una coordinación abierta: borra el detalle y libera la guía madre.' })
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.coordinar.anular(id);
  }
}
