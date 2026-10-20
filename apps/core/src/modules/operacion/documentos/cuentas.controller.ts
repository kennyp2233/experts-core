import { Controller, Get, Param, ParseIntPipe, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { CuentasService, FiltroCuentas } from './cuentas.service';
import { ArchivoReporte } from './reportes-dia.service';

const entero = (v?: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};
const filtro = (q: Record<string, string | undefined>): FiltroCuentas => ({
  desde: q.desde,
  hasta: q.hasta,
  idCliente: entero(q.idCliente),
  idAerolinea: entero(q.idAerolinea),
  incluirAbiertas: q.incluirAbiertas === 'true',
});

/** Cobro al cliente (oficina). Bajo `/api/v1/operacion/cuentas`. */
@ApiTags('Operación / Cuentas')
@ApiBearerAuth()
@Controller({ path: 'operacion/cuentas', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class CuentasController {
  constructor(private readonly service: CuentasService) {}

  @Get('estado-cuenta')
  @ApiOperation({ summary: 'Estado de cuenta de un cliente: `?idCliente=&desde=&hasta=` (cobro al cliente + handling).' })
  estadoCuenta(@Query() q: Record<string, string>) {
    return this.service.estadoCuenta({ ...filtro(q), idCliente: entero(q.idCliente)! });
  }

  @Get('estado-cuenta.xlsx')
  @ApiOperation({ summary: 'Estado de cuenta en Excel.' })
  async estadoCuentaXlsx(@Query() q: Record<string, string>, @Res() res: Response) {
    enviar(res, await this.service.estadoCuentaXlsx({ ...filtro(q), idCliente: entero(q.idCliente)! }));
  }

  @Get('ventas')
  @ApiOperation({ summary: 'Ventas y liquidación: costo aerolínea vs. cobrado por guía. `?desde=&hasta=&idAerolinea=&idCliente=`' })
  ventas(@Query() q: Record<string, string>) {
    return this.service.ventas(filtro(q));
  }

  @Get('ventas.xlsx')
  @ApiOperation({ summary: 'Ventas y liquidación en Excel.' })
  async ventasXlsx(@Query() q: Record<string, string>, @Res() res: Response) {
    enviar(res, await this.service.ventasXlsx(filtro(q)));
  }

  @Get('guias/:id')
  @ApiOperation({ summary: 'Liquidación de una guía al cliente (valores del cliente + handling), para imprimir.' })
  liquidacionGuia(@Param('id', ParseIntPipe) id: number) {
    return this.service.liquidacionGuia(id);
  }
}

export function enviar(res: Response, a: ArchivoReporte) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${a.nombreArchivo}"`);
  res.send(a.contenido);
}
