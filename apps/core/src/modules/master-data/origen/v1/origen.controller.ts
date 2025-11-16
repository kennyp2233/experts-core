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
import { OrigenService } from './origen.service';
import { CreateOrigenDto, UpdateOrigenDto, PaginationResponseDto } from './dto';
import { OrigenEntity } from './entities';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';

@ApiTags('Master Data - Origenes')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto, OrigenEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'master-data/origen',
  version: '1',
})
export class OrigenController {
  constructor(private readonly origenService: OrigenService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo origen' })
  @ApiResponse({
    status: 201,
    description: 'Origen creado exitosamente',
    type: OrigenEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createOrigenDto: CreateOrigenDto) {
    return this.origenService.create(createOrigenDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Obtener todos los origenes' })
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
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de origenes',
    type: PaginationResponseDto<OrigenEntity>,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.origenService.findAll(skipNum, takeNum, sortField, sortOrder);
  }

  @Roles(UserRole.ADMIN)
  @Get('search')
  @ApiOperation({ summary: 'Buscar origenes por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre o parte del nombre del origen',
  })
  @ApiResponse({
    status: 200,
    description: 'Origenes encontrados',
    isArray: true,
    type: OrigenEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async search(@Query('nombre') nombre: string) {
    return this.origenService.findByName(nombre);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un origen por ID' })
  @ApiResponse({
    status: 200,
    description: 'Origen encontrado',
    type: OrigenEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Origen no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.origenService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un origen' })
  @ApiResponse({
    status: 200,
    description: 'Origen actualizado exitosamente',
    type: OrigenEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Origen no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrigenDto: UpdateOrigenDto,
  ) {
    return this.origenService.update(id, updateOrigenDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un origen' })
  @ApiResponse({
    status: 200,
    description: 'Origen eliminado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Origen no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.origenService.remove(id);
  }
}
