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
import { AcuerdosArancelariosService } from './services/acuerdos-arancelarios.service';
import { CreateAcuerdoArancelarioDto, UpdateAcuerdoArancelarioDto } from './dto';
import { AcuerdoArancelario } from './entities/acuerdo-arancelario.entity';

@ApiTags('Acuerdos Arancelarios')
@ApiBearerAuth()
@Controller({
  path: 'master-data/acuerdos-arancelarios',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AcuerdosArancelariosController {
  constructor(private readonly acuerdosService: AcuerdosArancelariosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo acuerdo arancelario' })
  @ApiResponse({
    status: 201,
    description: 'Acuerdo arancelario creado exitosamente',
    type: AcuerdoArancelario,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async create(@Body() createAcuerdoDto: CreateAcuerdoArancelarioDto): Promise<AcuerdoArancelario> {
    return this.acuerdosService.create(createAcuerdoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los acuerdos arancelarios' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Número de registros a saltar' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Número de registros a obtener' })
  @ApiResponse({
    status: 200,
    description: 'Lista de acuerdos arancelarios obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AcuerdoArancelario' },
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
    return this.acuerdosService.findAll(skipNum, takeNum);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar acuerdos arancelarios por nombre' })
  @ApiQuery({ name: 'nombre', required: true, type: String, description: 'Nombre a buscar' })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda realizada exitosamente',
    type: [AcuerdoArancelario],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async searchByName(@Query('nombre') nombre: string): Promise<AcuerdoArancelario[]> {
    return this.acuerdosService.findByName(nombre);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un acuerdo arancelario por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del acuerdo arancelario' })
  @ApiResponse({
    status: 200,
    description: 'Acuerdo arancelario obtenido exitosamente',
    type: AcuerdoArancelario,
  })
  @ApiResponse({ status: 404, description: 'Acuerdo arancelario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async findOne(@Param('id') id: string): Promise<AcuerdoArancelario> {
    return this.acuerdosService.findOne(parseInt(id, 10));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un acuerdo arancelario' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del acuerdo arancelario' })
  @ApiResponse({
    status: 200,
    description: 'Acuerdo arancelario actualizado exitosamente',
    type: AcuerdoArancelario,
  })
  @ApiResponse({ status: 404, description: 'Acuerdo arancelario no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async update(
    @Param('id') id: string,
    @Body() updateAcuerdoDto: UpdateAcuerdoArancelarioDto,
  ): Promise<AcuerdoArancelario> {
    return this.acuerdosService.update(parseInt(id, 10), updateAcuerdoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un acuerdo arancelario' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del acuerdo arancelario' })
  @ApiResponse({
    status: 200,
    description: 'Acuerdo arancelario eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Acuerdo arancelario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async remove(@Param('id') id: string) {
    return this.acuerdosService.remove(parseInt(id, 10));
  }
}