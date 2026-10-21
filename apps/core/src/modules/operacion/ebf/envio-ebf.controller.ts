import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { EnvioEbfService } from './envio-ebf.service';
import { EquivalenciasEbfService, TIPOS_EQUIVALENCIA, TipoEquivalencia } from './equivalencias-ebf.service';
import { AprenderEquivalenciasDto, FijarEquivalenciaDto } from './envio-ebf.dto';
import { modoEnvioEbf } from './envio-ebf.types';

type ConUsuario = { user?: { username?: string; email?: string } };
const usuario = (req: ConUsuario) => req.user?.username ?? req.user?.email;

const tipo = (t: string): TipoEquivalencia => {
  const u = t.toUpperCase() as TipoEquivalencia;
  if (!TIPOS_EQUIVALENCIA.includes(u)) throw new BadRequestException(`Tipo inválido: ${t} (FINCA, MARCA o PRODUCTO).`);
  return u;
};

/** Coordinaciones frente a EBF (ADR 0004). Bajo `/api/v1/operacion/ebf`. */
@ApiTags('Operación / EBF')
@ApiBearerAuth()
@Controller({ path: 'operacion/ebf', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class EnvioEbfController {
  constructor(
    private readonly envio: EnvioEbfService,
    private readonly equivalencias: EquivalenciasEbfService,
  ) {}

  @Get('estado')
  @ApiOperation({ summary: 'Modo de envío (comparar / manual / automático) y horario de EBF.' })
  general() {
    return { modo: modoEnvioEbf(), ventana: this.envio.ventana() };
  }

  @Get('cola')
  @ApiOperation({ summary: 'Lo pendiente con EBF de las coordinaciones que vuelan de ayer a 7 días (sin leer EBF).' })
  cola() {
    return this.envio.cola();
  }

  @Get('coordinaciones/:id')
  @ApiOperation({ summary: 'Una coordinación frente a EBF: guía de EBF, estado, y cada guía hija (en EBF, por enviar, diferencias). `?fresco=1` relee EBF.' })
  estado(@Param('id', ParseIntPipe) id: number, @Query('fresco') fresco?: string) {
    return this.envio.estado(id, { fresco: fresco === '1' || fresco === 'true' });
  }

  @Get('coordinaciones/:id/bitacora')
  @ApiOperation({ summary: 'Lo que se envió a EBF (o se resolvió a mano) para esta coordinación.' })
  bitacora(@Param('id', ParseIntPipe) id: number) {
    return this.envio.bitacoraDe(id);
  }

  @Post('coordinaciones/:id/enviar')
  @ApiOperation({ summary: 'Envía lo pendiente a EBF (relee antes: lo que ya está no se duplica). Solo modo manual/automático y en horario.' })
  enviar(@Param('id', ParseIntPipe) id: number, @Req() req: ConUsuario) {
    return this.envio.enviar(id, usuario(req));
  }

  @Post('coordinaciones/:id/simular')
  @ApiOperation({ summary: 'Lo que se enviaría ahora, resuelto contra EBF (vuelo, DAE, producto), sin escribir nada. En cualquier modo.' })
  simular(@Param('id', ParseIntPipe) id: number) {
    return this.envio.simular(id);
  }

  @Post('coordinaciones/:id/revisar')
  @ApiOperation({ summary: '"Ya lo hice en EBF" / "Revisar EBF": relee en vivo y recalcula.' })
  revisar(@Param('id', ParseIntPipe) id: number, @Req() req: ConUsuario) {
    return this.envio.revisar(id, usuario(req));
  }

  @Post('lineas/:id/omitir')
  @ApiOperation({ summary: 'No enviar el cambio de esta guía hija (se hace a mano). Vale hasta que la línea cambie.' })
  omitir(@Param('id', ParseIntPipe) id: number, @Req() req: ConUsuario) {
    return this.envio.omitir(id, usuario(req));
  }

  @Delete('lineas/:id/omitir')
  @ApiOperation({ summary: 'Volver a enviar el cambio de esta guía hija.' })
  reactivar(@Param('id', ParseIntPipe) id: number, @Req() req: ConUsuario) {
    return this.envio.reactivar(id, usuario(req));
  }

  // ---------- Equivalencias ----------

  @Get('equivalencias')
  @ApiOperation({ summary: 'Enlaces finca ↔ exportador, marca ↔ marcación y producto ↔ producto de EBF. `?tipo=FINCA|MARCA|PRODUCTO`' })
  listarEquivalencias(@Query('tipo') t?: string) {
    return this.equivalencias.listar(t ? tipo(t) : undefined);
  }

  @Get('equivalencias/opciones/:tipo')
  @ApiOperation({ summary: 'Opciones de EBF para enlazar a mano (exportadores, marcaciones, productos vistos).' })
  opciones(@Param('tipo') t: string) {
    return this.equivalencias.opcionesEbf(tipo(t));
  }

  @Post('equivalencias/aprender')
  @ApiOperation({ summary: 'Aprende los enlaces de lo que la oficina ya tipeó en EBF (misma guía + misma DAE). No pisa lo confirmado.' })
  aprender(@Body() dto: AprenderEquivalenciasDto) {
    return this.equivalencias.aprender(dto.dias ?? 45);
  }

  @Put('equivalencias/:tipo/:idLocal')
  @ApiOperation({ summary: 'Enlazar a mano (queda confirmado).' })
  fijar(
    @Param('tipo') t: string,
    @Param('idLocal', ParseIntPipe) idLocal: number,
    @Body() dto: FijarEquivalenciaDto,
    @Req() req: ConUsuario,
  ) {
    return this.equivalencias.fijar(tipo(t), idLocal, dto.ebfNombre, dto.ebfId ?? null, usuario(req));
  }

  @Post('equivalencias/:tipo/:idLocal/confirmar')
  @ApiOperation({ summary: 'Confirmar un enlace aprendido del historial.' })
  confirmar(@Param('tipo') t: string, @Param('idLocal', ParseIntPipe) idLocal: number, @Req() req: ConUsuario) {
    return this.equivalencias.confirmar(tipo(t), idLocal, usuario(req));
  }

  @Delete('equivalencias/:tipo/:idLocal')
  @ApiOperation({ summary: 'Quitar un enlace.' })
  quitar(@Param('tipo') t: string, @Param('idLocal', ParseIntPipe) idLocal: number) {
    return this.equivalencias.quitar(tipo(t), idLocal);
  }
}
