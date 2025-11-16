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
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { MedidasService } from './services/medidas.service';
import { CreateMedidaDto, UpdateMedidaDto } from './dto';

@ApiTags('Medidas')
@ApiBearerAuth()
@Controller({
  path: 'master-data/medidas',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MedidasController {
  constructor(private readonly medidasService: MedidasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva medida' })
  @ApiResponse({
    status: 201,
    description: 'Medida creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o medida ya existe',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  create(@Body() createMedidaDto: CreateMedidaDto) {
    return this.medidasService.create(createMedidaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las medidas' })
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
    description: 'Lista de medidas obtenida exitosamente',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.medidasService.findAll(skipNum, takeNum);
  }

  @Get('simple')
  @UseGuards()
  @ApiOperation({ summary: 'Obtener medidas simples (id y nombre)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de medidas simples obtenida exitosamente',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findSimple() {
    return this.medidasService.findSimple();
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar medidas por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre de la medida a buscar',
  })
  @ApiResponse({
    status: 200,
    description: 'Medidas encontradas',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findByName(@Query('nombre') nombre: string) {
    return this.medidasService.findByName(nombre);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una medida por ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la medida',
  })
  @ApiResponse({
    status: 200,
    description: 'Medida encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Medida no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  findOne(@Param('id') id: string) {
    const idNum = parseInt(id, 10);
    return this.medidasService.findOne(idNum);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una medida' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la medida',
  })
  @ApiResponse({
    status: 200,
    description: 'Medida actualizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Medida no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  update(
    @Param('id') id: string,
    @Body() updateMedidaDto: UpdateMedidaDto,
  ) {
    const idNum = parseInt(id, 10);
    return this.medidasService.update(idNum, updateMedidaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una medida' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la medida',
  })
  @ApiResponse({
    status: 200,
    description: 'Medida eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Medida no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  remove(@Param('id') id: string) {
    const idNum = parseInt(id, 10);
    return this.medidasService.remove(idNum);
  }
}