import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { DaeFincaDto } from '../portal-fincas/portal-fincas.dto';
import { DaesService } from './daes.service';

type ConUsuario = { user?: { username?: string; email?: string } };

/** Registro de DAEs desde la oficina. Bajo `/api/v1/operacion/daes`. */
@ApiTags('Operación / DAEs')
@ApiBearerAuth()
@Controller({ path: 'operacion/daes', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class DaesController {
  constructor(private readonly service: DaesService) {}

  @Get()
  @ApiOperation({ summary: 'DAEs activas (de los últimos dos meses, o `?vigentes=true`). `?idFinca=&q=`' })
  listar(@Query('idFinca') idFinca?: string, @Query('q') q?: string, @Query('vigentes') vigentes?: string) {
    return this.service.listar({ idFinca: Number(idFinca) || undefined, q, vigentes: vigentes === 'true' });
  }

  @Post()
  @ApiOperation({ summary: 'Registra una DAE de cualquier finca (como F4 "Actualizar FUE" del viejo).' })
  crear(@Body() dto: DaeFincaDto, @Req() req: ConUsuario) {
    return this.service.crear(dto, req.user?.username ?? req.user?.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactiva una DAE (deja de proponerse al coordinar).' })
  quitar(@Param('id', ParseIntPipe) id: number) {
    return this.service.quitar(id);
  }
}
