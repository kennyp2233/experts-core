import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { AerolineaService } from './services/aerolinea.service';
import { CreateAerolineaDto, UpdateAerolineaDto } from './dto/create-aerolinea.dto';
import { AerolineaEntity } from './entities/aerolinea.entity';
import { PaginationResponseDto } from './dto/pagination-response.dto';

@ApiTags('master-data/aerolinea')
@ApiBearerAuth()
@Controller({
  path: 'master-data/aerolinea',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AerolineaController {
  constructor(private readonly aerolineaService: AerolineaService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva aerolínea' })
  @ApiResponse({ status: 201, description: 'Aerolinea creada exitosamente', type: AerolineaEntity })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  create(@Body() createAerolineaDto: CreateAerolineaDto): Promise<AerolineaEntity> {
    return this.aerolineaService.create(createAerolineaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las aerolíneas activas' })
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
  @ApiQuery({
    name: 'sortField',
    required: false,
    type: String,
    description: 'Campo por el cual ordenar',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Orden de clasificación (asc o desc)',
  })
  @ApiResponse({ status: 200, description: 'Lista de aerolíneas', type: PaginationResponseDto<AerolineaEntity> })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<PaginationResponseDto<AerolineaEntity>> {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.aerolineaService.findAll(skipNum, takeNum, sortField, sortOrder);
  }

  @Get('codigo/:codigo')
  @ApiOperation({ summary: 'Buscar aerolínea por código' })
  @ApiResponse({ status: 200, description: 'Aerolinea encontrada', type: AerolineaEntity })
  @ApiResponse({ status: 404, description: 'Aerolinea no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  findByCodigo(@Param('codigo') codigo: string): Promise<AerolineaEntity | null> {
    return this.aerolineaService.findByCodigo(codigo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una aerolínea por ID con todas sus relaciones' })
  @ApiResponse({ status: 200, description: 'Aerolinea encontrada con rutas y plantilla', type: AerolineaEntity })
  @ApiResponse({ status: 404, description: 'Aerolinea no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<AerolineaEntity> {
    return this.aerolineaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una aerolínea' })
  @ApiResponse({ status: 200, description: 'Aerolinea actualizada', type: AerolineaEntity })
  @ApiResponse({ status: 404, description: 'Aerolinea no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAerolineaDto: UpdateAerolineaDto,
  ): Promise<AerolineaEntity> {
    return this.aerolineaService.update(id, updateAerolineaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una aerolínea (soft delete)' })
  @ApiResponse({ status: 200, description: 'Aerolinea eliminada', type: AerolineaEntity })
  @ApiResponse({ status: 404, description: 'Aerolinea no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<AerolineaEntity> {
    return this.aerolineaService.remove(id);
  }
}