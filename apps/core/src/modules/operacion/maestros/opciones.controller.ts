import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { OpcionesService } from './opciones.service';

/** Buscadores de la pantalla de coordinar. Bajo `/api/v1/operacion/opciones`. */
@ApiTags('Operación / Opciones')
@ApiBearerAuth()
@Controller({ path: 'operacion/opciones', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class OpcionesController {
  constructor(private readonly service: OpcionesService) {}

  @Get('consignatarios/:id/sugerencia')
  @ApiOperation({ summary: 'Defaults al elegir la marca: destino y valores de su última coordinación.' })
  sugerencia(@Param('id', ParseIntPipe) id: number) {
    return this.service.sugerenciaConsignatario(id);
  }

  @Get('daes')
  @ApiOperation({ summary: 'DAE vigente por finca para un destino y fecha de vuelo (como el F2 del viejo). `?fincas=1,2&idDestino=&fecha=AAAA-MM-DD&origen=UIO`' })
  daes(
    @Query('fincas') fincas: string,
    @Query('idDestino', ParseIntPipe) idDestino: number,
    @Query('fecha') fecha: string,
    @Query('origen') origen?: string,
  ) {
    const ids = (fincas ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 200);
    return this.service.daesVigentes(ids, idDestino, fecha, origen?.trim().toUpperCase() || 'UIO');
  }

  @Get(':tipo')
  @ApiOperation({ summary: 'Opciones activas: guias (libres), consignatarios, fincas, productos, agencias, aerolineas, destinos, tipos-embarque.' })
  buscar(
    @Param('tipo') tipo: string,
    @Query('q') q?: string,
    @Query('limite') limite?: string,
    @Query('ids') ids?: string,
    @Query('idAerolinea') idAerolinea?: string,
  ) {
    const lista = ids
      ?.split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    return this.service.buscar(tipo, q ?? '', limite ? Number(limite) || 20 : 20, lista, Number(idAerolinea) || undefined);
  }
}
