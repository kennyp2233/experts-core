import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { ChoferesService } from './services';
import { CreateChoferDto, UpdateChoferDto } from './dto';

@ApiTags('Choferes')
@ApiBearerAuth()
@Controller({
  path: 'master-data/choferes',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ChoferesController {
  constructor(private readonly choferesService: ChoferesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo chofer' })
  @ApiResponse({
    status: 201,
    description: 'Chofer creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o chofer ya existe',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  create(@Body() createChoferDto: CreateChoferDto) {
    return this.choferesService.create(createChoferDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los choferes' })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de registros a saltar',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de registros a obtener',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de choferes obtenida exitosamente',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findAll(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
  ) {
    return this.choferesService.findAll(skip, take);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar choferes por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre del chofer a buscar',
  })
  @ApiResponse({
    status: 200,
    description: 'Choferes encontrados',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findByName(@Query('nombre') nombre: string) {
    return this.choferesService.findByName(nombre);
  }

  @Get('ruc/:ruc')
  @ApiOperation({ summary: 'Buscar chofer por RUC' })
  @ApiParam({
    name: 'ruc',
    type: String,
    description: 'RUC del chofer',
  })
  @ApiResponse({
    status: 200,
    description: 'Chofer encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Chofer no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findByRuc(@Param('ruc') ruc: string) {
    return this.choferesService.findByRuc(ruc);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un chofer por ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del chofer',
  })
  @ApiResponse({
    status: 200,
    description: 'Chofer encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Chofer no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.choferesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un chofer' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del chofer',
  })
  @ApiResponse({
    status: 200,
    description: 'Chofer actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Chofer no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChoferDto: UpdateChoferDto,
  ) {
    return this.choferesService.update(id, updateChoferDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un chofer' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del chofer',
  })
  @ApiResponse({
    status: 200,
    description: 'Chofer eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Chofer no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.choferesService.remove(id);
  }
}