import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { PaisesService } from './services/paises.service';
import { CreatePaisDto, UpdatePaisDto } from './dto';
import { Pais } from './entities/pais.entity';

@ApiTags('Paises')
@ApiBearerAuth()
@Controller({
  path: 'master-data/paises',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PaisesController {
  constructor(private readonly paisesService: PaisesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo país' })
  @ApiResponse({
    status: 201,
    description: 'País creado exitosamente',
    type: Pais,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async create(@Body() createPaisDto: CreatePaisDto): Promise<Pais> {
    return this.paisesService.create(createPaisDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los países' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Número de registros a saltar' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Número de registros a obtener' })
  @ApiResponse({
    status: 200,
    description: 'Lista de países obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Pais' },
        },
        total: { type: 'number' },
        skip: { type: 'number' },
        take: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.paisesService.findAll(skipNum, takeNum);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar países por nombre' })
  @ApiQuery({ name: 'nombre', required: true, type: String, description: 'Nombre a buscar' })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda realizada exitosamente',
    type: [Pais],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async searchByName(@Query('nombre') nombre: string): Promise<Pais[]> {
    return this.paisesService.findByName(nombre);
  }

  @Get('siglas/:siglas')
  @ApiOperation({ summary: 'Buscar país por siglas' })
  @ApiParam({ name: 'siglas', type: String, description: 'Siglas del país' })
  @ApiResponse({
    status: 200,
    description: 'País encontrado exitosamente',
    type: Pais,
  })
  @ApiResponse({ status: 404, description: 'País no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async findBySiglas(@Param('siglas') siglas: string): Promise<Pais> {
    return this.paisesService.findBySiglas(siglas);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un país por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del país' })
  @ApiResponse({
    status: 200,
    description: 'País obtenido exitosamente',
    type: Pais,
  })
  @ApiResponse({ status: 404, description: 'País no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async findOne(@Param('id') id: string): Promise<Pais> {
    return this.paisesService.findOne(parseInt(id, 10));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un país' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del país' })
  @ApiResponse({
    status: 200,
    description: 'País actualizado exitosamente',
    type: Pais,
  })
  @ApiResponse({ status: 404, description: 'País no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async update(
    @Param('id') id: string,
    @Body() updatePaisDto: UpdatePaisDto,
  ): Promise<Pais> {
    return this.paisesService.update(parseInt(id, 10), updatePaisDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un país' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del país' })
  @ApiResponse({
    status: 200,
    description: 'País eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'País no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async remove(@Param('id') id: string) {
    return this.paisesService.remove(parseInt(id, 10));
  }
}