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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import {
  CreateClienteDto,
  UpdateClienteDto,
  PaginationResponseDto,
} from './dto';
import { ClienteEntity } from './entities';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';

@ApiTags('Master Data - Clientes')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto, ClienteEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'master-data/clientes',
  version: '1',
})
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({
    status: 201,
    description: 'Cliente creado exitosamente',
    type: ClienteEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Obtener todos los clientes' })
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
    description: 'Lista paginada de clientes',
    type: PaginationResponseDto<ClienteEntity>,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.clientesService.findAll(skipNum, takeNum);
  }

  @Roles(UserRole.ADMIN)
  @Get('search')
  @ApiOperation({ summary: 'Buscar clientes por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre o parte del nombre del cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Clientes encontrados',
    isArray: true,
    type: ClienteEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async search(@Query('nombre') nombre: string) {
    return this.clientesService.findByName(nombre);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: ClienteEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado exitosamente',
    type: ClienteEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente eliminado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.remove(id);
  }
}