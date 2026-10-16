import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { GuiasMadreService } from './guias-madre.service';
import { ListarGuiasMadreDto } from './dto/listar-guias-madre.dto';
import { IngresarLoteDto, PrestarGuiaDto } from './dto/stock-guias.dto';
import { StockGuiasService } from './stock-guias.service';

/** Stock de guías AWB. Bajo `/api/v1/operacion/guias-madre`. */
@ApiTags('Operación / Stock de guías')
@ApiBearerAuth()
@Controller({ path: 'operacion/guias-madre', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class GuiasMadreController {
  constructor(
    private readonly service: GuiasMadreService,
    private readonly stock: StockGuiasService,
  ) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Stock por aerolínea: disponibles, coordinadas, prestadas.' })
  resumen() {
    return this.service.resumen();
  }

  @Get()
  @ApiOperation({ summary: 'Guías del stock con filtros (estado, aerolínea, número, virtual).' })
  listar(@Query() filtros: ListarGuiasMadreDto) {
    return this.service.listar(filtros);
  }

  @Post('lotes/previsualizar')
  @ApiOperation({ summary: 'Arma un lote sin guardarlo: números con su dígito verificador y los que ya están en el stock.' })
  previsualizar(@Body() dto: IngresarLoteDto) {
    return this.stock.previsualizar(dto);
  }

  @Post('lotes')
  @ApiOperation({ summary: 'Ingresa un lote de guías consecutivas de una aerolínea al stock.' })
  ingresarLote(@Body() dto: IngresarLoteDto) {
    return this.stock.ingresarLote(dto);
  }

  @Post(':id/prestamo')
  @ApiOperation({ summary: 'Presta una guía disponible a otra agencia.' })
  prestar(@Param('id', ParseIntPipe) id: number, @Body() dto: PrestarGuiaDto) {
    return this.stock.prestar(id, dto);
  }

  @Post(':id/devolucion')
  @ApiOperation({ summary: 'Registra la devolución de una guía prestada.' })
  devolver(@Param('id', ParseIntPipe) id: number, @Body() dto: PrestarGuiaDto) {
    return this.stock.devolver(id, dto);
  }
}
