import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { CoordinacionesService } from './coordinaciones.service';
import { ListarCoordinacionesDto } from './dto/listar-coordinaciones.dto';
import { CorregirCoordinacionDto, GuardarCoordinacionDto, TransferirLineasDto } from './dto/guardar-coordinacion.dto';
import { CoordinarService } from './coordinar.service';
import { FlowerCargoService } from '../documentos/flowercargo.service';
import { ArchivoReporte, ReportesDiaService } from '../documentos/reportes-dia.service';
import { ImpresionService } from '../documentos/impresion.service';

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
    private readonly impresion: ImpresionService,
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

  @Get('anuladas')
  @ApiOperation({ summary: 'Coordinaciones anuladas en el sistema nuevo: qué se anuló, quién y cuándo. `?desde=&hasta=`' })
  anuladas(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.anuladas(desde, hasta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle: guías hijas con sus líneas, liquidación, ruta, manifiesto, marcas y medidas.' })
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.detalle(id);
  }

  @Get(':id/guias-hijas/impresion')
  @ApiOperation({ summary: 'Datos para imprimir las guías hijas por finca (House Air Waybill). `?guiaHija=` para una sola.' })
  impresionGuiasHijas(@Param('id', ParseIntPipe) id: number, @Query('guiaHija') guiaHija?: string) {
    return this.impresion.guiasHijas(id, Number(guiaHija) || undefined);
  }

  @Get(':id/guia-madre/impresion')
  @ApiOperation({
    summary: 'Datos para imprimir la guía madre (AWB), ya formateados. `?valores=aerolinea|cliente` (cliente = corte extra).',
  })
  impresionGuiaMadre(@Param('id', ParseIntPipe) id: number, @Query('valores') valores?: string) {
    return this.impresion.guiaMadre(id, valores === 'cliente' ? 'cliente' : 'aerolinea');
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

  @Patch(':id')
  @ApiOperation({ summary: 'Corrige la factura / nota de las líneas y la nota de la guía (también después del corte).' })
  corregir(@Param('id', ParseIntPipe) id: number, @Body() dto: CorregirCoordinacionDto, @Req() req: ConUsuario) {
    return this.coordinar.corregir(id, dto, usuario(req));
  }

  @Post(':id/transferir')
  @ApiOperation({ summary: 'Pasa líneas (cajas de una finca) a otra coordinación abierta, recalculando las dos.' })
  transferir(@Param('id', ParseIntPipe) id: number, @Body() dto: TransferirLineasDto, @Req() req: ConUsuario) {
    return this.coordinar.transferir(id, dto, usuario(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Anula una coordinación abierta: libera la guía madre y deja constancia (quién, cuándo, `?motivo=`).' })
  anular(@Param('id', ParseIntPipe) id: number, @Req() req: ConUsuario, @Query('motivo') motivo?: string) {
    return this.coordinar.anular(id, usuario(req), motivo);
  }
}
