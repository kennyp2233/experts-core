import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';
import { enviar } from '../documentos/cuentas.controller';
import { ActualizarUsuarioClienteDto, CrearUsuarioClienteDto } from './portal-clientes.dto';
import { PortalClientesService, UsuarioCliente } from './portal-clientes.service';
import { UsuariosClientesService } from './usuarios-clientes.service';

type ConUsuario = { user: UsuarioCliente };

/** Portal de los clientes (rol CLIENTE). Bajo `/api/v1/portal-clientes`. */
@ApiTags('Portal de clientes')
@ApiBearerAuth()
@Controller({ path: 'portal-clientes', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENTE)
export class PortalClientesController {
  constructor(private readonly service: PortalClientesService) {}

  @Get('perfil')
  @ApiOperation({ summary: 'Usuario y sus clientes.' })
  perfil(@Req() req: ConUsuario) {
    return this.service.perfil(req.user);
  }

  @Get('guias')
  @ApiOperation({ summary: 'Sus guías (de sus marcas), de la más reciente. `?desde=&hasta=&q=&page=`' })
  guias(@Req() req: ConUsuario, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('q') q?: string, @Query('page') page?: string) {
    return this.service.guias(req.user, { desde, hasta, q, page: Number(page) || 1 });
  }

  @Get('guias/:id')
  @ApiOperation({ summary: 'Una guía: vuelo, guías hijas por finca y, si ya se cortó, lo que se le cobra.' })
  guia(@Req() req: ConUsuario, @Param('id', ParseIntPipe) id: number) {
    return this.service.guia(req.user, id);
  }

  @Get('guias/:id/guias-hijas/impresion')
  @ApiOperation({ summary: 'Datos para imprimir sus guías hijas (House Air Waybill por finca).' })
  impresion(@Req() req: ConUsuario, @Param('id', ParseIntPipe) id: number) {
    return this.service.impresionGuiasHijas(req.user, id);
  }

  @Get('estado-cuenta')
  @ApiOperation({ summary: 'Su estado de cuenta. `?desde=&hasta=&idCliente=` (idCliente si tiene varios).' })
  estadoCuenta(@Req() req: ConUsuario, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('idCliente') idCliente?: string) {
    return this.service.estadoCuenta(req.user, { desde, hasta, idCliente: Number(idCliente) || undefined });
  }

  @Get('estado-cuenta.xlsx')
  @ApiOperation({ summary: 'Su estado de cuenta en Excel.' })
  async estadoCuentaXlsx(
    @Req() req: ConUsuario,
    @Res() res: Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('idCliente') idCliente?: string,
  ) {
    enviar(res, await this.service.estadoCuentaXlsx(req.user, { desde, hasta, idCliente: Number(idCliente) || undefined }));
  }
}

/** La oficina administra los usuarios de los clientes. Bajo `/api/v1/operacion/usuarios-clientes`. */
@ApiTags('Operación / Usuarios de clientes')
@ApiBearerAuth()
@Controller({ path: 'operacion/usuarios-clientes', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsuariosClientesController {
  constructor(private readonly service: UsuariosClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Usuarios de cliente con sus clientes.' })
  listar() {
    return this.service.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crea un usuario de cliente; devuelve la clave (se muestra una sola vez).' })
  crear(@Body() dto: CrearUsuarioClienteDto) {
    return this.service.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cambia nombre, clientes o si está activo.' })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUsuarioClienteDto) {
    return this.service.actualizar(id, dto);
  }

  @Post(':id/clave')
  @ApiOperation({ summary: 'Genera una clave nueva (se muestra una sola vez).' })
  nuevaClave(@Param('id') id: string) {
    return this.service.nuevaClave(id);
  }
}
