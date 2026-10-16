import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { ValidacionService } from './validacion.service';

/** Validación de la lógica del sistema nuevo contra el viejo. Bajo `/api/v1/operacion/validacion`. */
@ApiTags('Operación / Validación contra el sistema viejo')
@ApiBearerAuth()
@Controller({ path: 'operacion', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class ValidacionController {
  constructor(private readonly service: ValidacionService) {}

  @Get('validacion')
  @ApiOperation({
    summary: 'Por cada regla: en cuántas coordinaciones del sistema viejo el cálculo nuevo coincide, y ejemplos de las que no.',
  })
  @ApiQuery({ name: 'fresco', required: false, type: Boolean, description: 'Recalcula sin usar el resultado guardado (10 min)' })
  reporte(@Query('fresco') fresco?: string) {
    return this.service.reporte(fresco === 'true' || fresco === '1');
  }

  @Get('coordinaciones/:id/validacion')
  @ApiOperation({ summary: 'Resultado de cada regla para una coordinación.' })
  deCoordinacion(@Param('id', ParseIntPipe) id: number) {
    return this.service.deCoordinacion(id);
  }
}
