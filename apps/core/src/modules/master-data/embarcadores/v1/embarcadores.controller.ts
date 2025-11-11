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
import { EmbarcadoresService } from './embarcadores.service';
import {
  CreateEmbarcadorDto,
  UpdateEmbarcadorDto,
  PaginationResponseDto,
} from './dto';
import { EmbarcadorEntity } from './entities';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';

@ApiTags('Master Data - Embarcadores')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto, EmbarcadorEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'master-data/embarcadores',
  version: '1',
})
export class EmbarcadoresController {
  constructor(private readonly embarcadoresService: EmbarcadoresService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo embarcador' })
  @ApiResponse({
    status: 201,
    description: 'Embarcador creado exitosamente',
    type: EmbarcadorEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createEmbarcadorDto: CreateEmbarcadorDto) {
    return this.embarcadoresService.create(createEmbarcadorDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Obtener todos los embarcadores' })
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
    description: 'Lista paginada de embarcadores',
    type: PaginationResponseDto<EmbarcadorEntity>,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.embarcadoresService.findAll(skipNum, takeNum);
  }

  @Roles(UserRole.ADMIN)
  @Get('search')
  @ApiOperation({ summary: 'Buscar embarcadores por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre o parte del nombre del embarcador',
  })
  @ApiResponse({
    status: 200,
    description: 'Embarcadores encontrados',
    isArray: true,
    type: EmbarcadorEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async search(@Query('nombre') nombre: string) {
    return this.embarcadoresService.findByName(nombre);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un embarcador por ID' })
  @ApiResponse({
    status: 200,
    description: 'Embarcador encontrado',
    type: EmbarcadorEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Embarcador no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.embarcadoresService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un embarcador' })
  @ApiResponse({
    status: 200,
    description: 'Embarcador actualizado exitosamente',
    type: EmbarcadorEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Embarcador no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmbarcadorDto: UpdateEmbarcadorDto,
  ) {
    return this.embarcadoresService.update(id, updateEmbarcadorDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un embarcador' })
  @ApiResponse({
    status: 200,
    description: 'Embarcador eliminado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Embarcador no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.embarcadoresService.remove(id);
  }
}
