import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { CorteDefinitivoService } from './corte-definitivo.service';

type ConUsuario = { user?: { username?: string; email?: string } };

/** Paso del sistema viejo al nuevo. Bajo `/api/v1/operacion/corte-definitivo` (solo ADMIN). */
@ApiTags('Operación / Corte definitivo')
@ApiBearerAuth()
@Controller({ path: 'operacion/corte-definitivo', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CorteDefinitivoController {
  constructor(private readonly service: CorteDefinitivoService) {}

  @Get()
  @ApiOperation({ summary: 'Modo de operación, contadores del sistema nuevo vs. últimos números de Access, y pasos del corte.' })
  estado() {
    return this.service.estado();
  }

  @Post('alinear-contadores')
  @ApiOperation({ summary: 'Solo con OPERACION_MODO=activo: la numeración sigue la del sistema viejo (último N° de Access + 1).' })
  alinear(@Req() req: ConUsuario) {
    return this.service.alinearContadores(req.user?.username ?? req.user?.email);
  }
}
