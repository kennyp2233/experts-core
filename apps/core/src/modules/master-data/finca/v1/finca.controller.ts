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
import { FincaService } from './services/finca.service';
import { CreateFincaDto, UpdateFincaDto } from './dto';

@ApiTags('Fincas')
@ApiBearerAuth()
@Controller({
  path: 'master-data/fincas',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FincaController {
  constructor(private readonly fincaService: FincaService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva finca' })
  @ApiResponse({
    status: 201,
    description: 'Finca creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o finca ya existe',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  create(@Body() createFincaDto: CreateFincaDto) {
    return this.fincaService.create(createFincaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las fincas' })
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
    description: 'Lista de fincas obtenida exitosamente',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findAll(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
  ) {
    return this.fincaService.findAll(skip, take);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar fincas por nombre' })
  @ApiQuery({
    name: 'nombreFinca',
    required: true,
    type: String,
    description: 'Nombre de la finca a buscar',
  })
  @ApiResponse({
    status: 200,
    description: 'Fincas encontradas',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findByName(@Query('nombreFinca') nombreFinca: string) {
    return this.fincaService.findByName(nombreFinca);
  }

  @Get('ruc/:rucFinca')
  @ApiOperation({ summary: 'Buscar finca por RUC' })
  @ApiParam({
    name: 'rucFinca',
    type: String,
    description: 'RUC de la finca',
  })
  @ApiResponse({
    status: 200,
    description: 'Finca encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Finca no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findByRuc(@Param('rucFinca') rucFinca: string) {
    return this.fincaService.findByRuc(rucFinca);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una finca por ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la finca',
  })
  @ApiResponse({
    status: 200,
    description: 'Finca encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Finca no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fincaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una finca' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la finca',
  })
  @ApiResponse({
    status: 200,
    description: 'Finca actualizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Finca no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFincaDto: UpdateFincaDto,
  ) {
    return this.fincaService.update(id, updateFincaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una finca' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la finca',
  })
  @ApiResponse({
    status: 200,
    description: 'Finca eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Finca no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fincaService.remove(id);
  }
}