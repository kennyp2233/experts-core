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
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { SubAgenciaService } from './services/sub-agencia.service';
import { CreateSubAgenciaDto, UpdateSubAgenciaDto } from './dto';
import { SubAgenciaEntity } from './entities/sub-agencia.entity';

@ApiTags('sub-agencia')
@ApiBearerAuth()
@Controller({
  path: 'master-data/sub-agencia',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SubAgenciaController {
    constructor(private readonly subAgenciaService: SubAgenciaService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new sub agencia' })
    @ApiResponse({
        status: 201,
        description: 'The sub agencia has been successfully created.',
        type: SubAgenciaEntity,
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(@Body() createDto: CreateSubAgenciaDto) {
        return this.subAgenciaService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all sub agencias' })
    @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Número de registros a saltar' })
    @ApiQuery({ name: 'take', required: false, type: Number, description: 'Número de registros a obtener' })
    @ApiResponse({
        status: 200,
        description: 'List of all sub agencias',
        type: [SubAgenciaEntity],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
        const skipNum = skip ? parseInt(skip, 10) : undefined;
        const takeNum = take ? parseInt(take, 10) : undefined;
        return this.subAgenciaService.findAll(skipNum, takeNum);
    }

    @Get('search')
    @ApiOperation({ summary: 'Search sub agencias by nombre' })
    @ApiQuery({ name: 'nombre', required: true, type: String, description: 'Nombre a buscar' })
    @ApiResponse({
        status: 200,
        description: 'Sub agencias encontradas',
        type: [SubAgenciaEntity],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    search(@Query('nombre') nombre: string) {
        return this.subAgenciaService.findByNombre(nombre);
    }

    @Get('nombre/:nombre')
    @ApiOperation({ summary: 'Get a sub agencia by nombre' })
    @ApiResponse({
        status: 200,
        description: 'The sub agencia',
        type: SubAgenciaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findByNombre(@Param('nombre') nombre: string) {
        return this.subAgenciaService.findByNombre(decodeURIComponent(nombre));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a sub agencia by ID' })
    @ApiResponse({
        status: 200,
        description: 'The sub agencia',
        type: SubAgenciaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.subAgenciaService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a sub agencia' })
    @ApiResponse({
        status: 200,
        description: 'The sub agencia has been successfully updated.',
        type: SubAgenciaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateSubAgenciaDto) {
        return this.subAgenciaService.update(id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a sub agencia (soft delete)' })
    @ApiResponse({
        status: 200,
        description: 'The sub agencia has been successfully deleted.',
        type: SubAgenciaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.subAgenciaService.remove(id);
    }
}