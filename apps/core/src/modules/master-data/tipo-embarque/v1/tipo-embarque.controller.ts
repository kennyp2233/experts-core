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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { TipoEmbarqueService } from './services/tipo-embarque.service';
import { CreateTipoEmbarqueDto, UpdateTipoEmbarqueDto } from './dto';
import { TipoEmbarqueEntity } from './entities/tipo-embarque.entity';

@ApiTags('tipo-embarque')
@Controller({
  path: 'master-data/tipo-embarque',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TipoEmbarqueController {
    constructor(private readonly tipoEmbarqueService: TipoEmbarqueService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new tipo de embarque' })
    @ApiResponse({
        status: 201,
        description: 'The tipo de embarque has been successfully created.',
        type: TipoEmbarqueEntity,
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(@Body() createDto: CreateTipoEmbarqueDto) {
        return this.tipoEmbarqueService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tipos de embarque' })
    @ApiResponse({
        status: 200,
        description: 'List of all tipos de embarque',
        type: [TipoEmbarqueEntity],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll() {
        return this.tipoEmbarqueService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a tipo de embarque by ID' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embarque',
        type: TipoEmbarqueEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findOne(@Param('id') id: string) {
        return this.tipoEmbarqueService.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a tipo de embarque' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embarque has been successfully updated.',
        type: TipoEmbarqueEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    update(@Param('id') id: string, @Body() updateDto: UpdateTipoEmbarqueDto) {
        return this.tipoEmbarqueService.update(+id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a tipo de embarque' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embarque has been successfully deleted.',
        type: TipoEmbarqueEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    remove(@Param('id') id: string) {
        return this.tipoEmbarqueService.remove(+id);
    }

    @Get('nombre/:nombre')
    @ApiOperation({ summary: 'Get a tipo de embarque by nombre' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embarque',
        type: TipoEmbarqueEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findByNombre(@Param('nombre') nombre: string) {
        return this.tipoEmbarqueService.findByNombre(decodeURIComponent(nombre));
    }
}