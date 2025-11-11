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
import { ConsignatariosService } from './services/consignatarios.service';
import { CreateConsignatarioDto } from './dto/create-consignatario.dto';
import { UpdateConsignatarioDto } from './dto/update-consignatario.dto';
import { ConsignatarioEntity } from './entities/consignatario.entity';

@ApiTags('Consignatarios')
@ApiBearerAuth()
@Controller({
  path: 'master-data/consignatarios',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ConsignatariosController {
    constructor(private readonly consignatariosService: ConsignatariosService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo consignatario' })
    @ApiResponse({
        status: 201,
        description: 'Consignatario creado exitosamente',
        type: ConsignatarioEntity,
    })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    @ApiResponse({ status: 403, description: 'Rol insuficiente' })
    async create(@Body() createConsignatarioDto: CreateConsignatarioDto): Promise<ConsignatarioEntity> {
        return this.consignatariosService.create(createConsignatarioDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los consignatarios' })
    @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Número de registros a saltar' })
    @ApiQuery({ name: 'take', required: false, type: Number, description: 'Número de registros a obtener' })
    @ApiResponse({
        status: 200,
        description: 'Lista de consignatarios obtenida exitosamente',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ConsignatarioEntity' },
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
        return this.consignatariosService.findAll(skipNum, takeNum);
    }

    @Get('search')
    @ApiOperation({ summary: 'Buscar consignatarios por nombre' })
    @ApiQuery({ name: 'nombre', required: true, type: String, description: 'Nombre a buscar' })
    @ApiResponse({
        status: 200,
        description: 'Búsqueda realizada exitosamente',
        type: [ConsignatarioEntity],
    })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    @ApiResponse({ status: 403, description: 'Rol insuficiente' })
    async searchByName(@Query('nombre') nombre: string): Promise<ConsignatarioEntity[]> {
        return this.consignatariosService.findByName(nombre);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un consignatario por ID' })
    @ApiParam({ name: 'id', type: Number, description: 'ID del consignatario' })
    @ApiResponse({
        status: 200,
        description: 'Consignatario obtenido exitosamente',
        type: ConsignatarioEntity,
    })
    @ApiResponse({ status: 404, description: 'Consignatario no encontrado' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    @ApiResponse({ status: 403, description: 'Rol insuficiente' })
    async findOne(@Param('id') id: string): Promise<ConsignatarioEntity> {
        return this.consignatariosService.findOne(parseInt(id, 10));
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar un consignatario' })
    @ApiParam({ name: 'id', type: Number, description: 'ID del consignatario' })
    @ApiResponse({
        status: 200,
        description: 'Consignatario actualizado exitosamente',
        type: ConsignatarioEntity,
    })
    @ApiResponse({ status: 404, description: 'Consignatario no encontrado' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    @ApiResponse({ status: 403, description: 'Rol insuficiente' })
    async update(
        @Param('id') id: string,
        @Body() updateConsignatarioDto: UpdateConsignatarioDto,
    ): Promise<ConsignatarioEntity> {
        return this.consignatariosService.update(parseInt(id, 10), updateConsignatarioDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Eliminar un consignatario' })
    @ApiParam({ name: 'id', type: Number, description: 'ID del consignatario' })
    @ApiResponse({
        status: 200,
        description: 'Consignatario eliminado exitosamente',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Consignatario no encontrado' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    @ApiResponse({ status: 403, description: 'Rol insuficiente' })
    async remove(@Param('id') id: string) {
        return this.consignatariosService.remove(parseInt(id, 10));
    }
}