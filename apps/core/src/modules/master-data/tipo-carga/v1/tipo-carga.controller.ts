import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    HttpCode,
    HttpStatus,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { TipoCargaService } from './services/tipo-carga.service';
import { CreateTipoCargaDto, UpdateTipoCargaDto } from './dto';
import { TipoCargaEntity } from './entities/tipo-carga.entity';

@ApiTags('tipo-carga')
@ApiBearerAuth()
@Controller({
  path: 'master-data/tipo-carga',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TipoCargaController {
    constructor(private readonly tipoCargaService: TipoCargaService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new tipo de carga' })
    @ApiResponse({
        status: 201,
        description: 'The tipo de carga has been successfully created.',
        type: TipoCargaEntity,
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(@Body() createDto: CreateTipoCargaDto) {
        return this.tipoCargaService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tipos de carga' })
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
        name: 'search',
        required: false,
        type: String,
        description: 'Término de búsqueda',
    })
    @ApiResponse({
        status: 200,
        description: 'List of all tipos de carga',
        type: [TipoCargaEntity],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll(@Query('skip') skip?: string, @Query('take') take?: string, @Query('search') search?: string) {
        const skipNum = skip ? parseInt(skip, 10) : undefined;
        const takeNum = take ? parseInt(take, 10) : undefined;
        return this.tipoCargaService.findAll(skipNum, takeNum, search);
    }

    @Get('nombre/:nombre')
    @ApiOperation({ summary: 'Get a tipo de carga by nombre' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de carga',
        type: TipoCargaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findByNombre(@Param('nombre') nombre: string) {
        return this.tipoCargaService.findByNombre(decodeURIComponent(nombre));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a tipo de carga by ID' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de carga',
        type: TipoCargaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.tipoCargaService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a tipo de carga' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de carga has been successfully updated.',
        type: TipoCargaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTipoCargaDto) {
        return this.tipoCargaService.update(id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a tipo de carga' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de carga has been successfully deleted.',
        type: TipoCargaEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.tipoCargaService.remove(id);
    }
}