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
import { DestinoService } from './destino.service';
import {
  CreateDestinoDto,
  UpdateDestinoDto,
  PaginationResponseDto,
} from './dto';
import { DestinoEntity } from './entities';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';

@ApiTags('Master Data - Destinos')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto, DestinoEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'master-data/destinos',
  version: '1',
})
export class DestinoController {
  constructor(private readonly destinoService: DestinoService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo destino' })
  @ApiResponse({
    status: 201,
    description: 'Destino creado exitosamente',
    type: DestinoEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createDestinoDto: CreateDestinoDto) {
    return this.destinoService.create(createDestinoDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Obtener todos los destinos' })
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
    description: 'Lista paginada de destinos',
    type: PaginationResponseDto<DestinoEntity>,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.destinoService.findAll(skipNum, takeNum);
  }

  @Roles(UserRole.ADMIN)
  @Get('search')
  @ApiOperation({ summary: 'Buscar destinos por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre o parte del nombre del destino',
  })
  @ApiResponse({
    status: 200,
    description: 'Destinos encontrados',
    isArray: true,
    type: DestinoEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async search(@Query('nombre') nombre: string) {
    return this.destinoService.findByName(nombre);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un destino por ID' })
  @ApiResponse({
    status: 200,
    description: 'Destino encontrado',
    type: DestinoEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Destino no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.destinoService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un destino' })
  @ApiResponse({
    status: 200,
    description: 'Destino actualizado exitosamente',
    type: DestinoEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Destino no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDestinoDto: UpdateDestinoDto,
  ) {
    return this.destinoService.update(id, updateDestinoDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un destino' })
  @ApiResponse({
    status: 200,
    description: 'Destino eliminado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Destino no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.destinoService.remove(id);
  }
}
