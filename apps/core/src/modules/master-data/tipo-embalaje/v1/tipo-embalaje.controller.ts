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
import { TipoEmbalajeService } from './services/tipo-embalaje.service';
import { CreateTipoEmbalajeDto, UpdateTipoEmbalajeDto } from './dto';
import { TipoEmbalajeEntity } from './entities/tipo-embalaje.entity';

@ApiTags('tipo-embalaje')
@Controller({
  path: 'master-data/tipo-embalaje',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TipoEmbalajeController {
    constructor(private readonly tipoEmbalajeService: TipoEmbalajeService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new tipo de embalaje' })
    @ApiResponse({
        status: 201,
        description: 'The tipo de embalaje has been successfully created.',
        type: TipoEmbalajeEntity,
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(@Body() createDto: CreateTipoEmbalajeDto) {
        return this.tipoEmbalajeService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tipos de embalaje' })
    @ApiResponse({
        status: 200,
        description: 'List of all tipos de embalaje',
        type: [TipoEmbalajeEntity],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll() {
        return this.tipoEmbalajeService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a tipo de embalaje by ID' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embalaje',
        type: TipoEmbalajeEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findOne(@Param('id') id: string) {
        return this.tipoEmbalajeService.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a tipo de embalaje' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embalaje has been successfully updated.',
        type: TipoEmbalajeEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    update(@Param('id') id: string, @Body() updateDto: UpdateTipoEmbalajeDto) {
        return this.tipoEmbalajeService.update(+id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a tipo de embalaje' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embalaje has been successfully deleted.',
        type: TipoEmbalajeEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    remove(@Param('id') id: string) {
        return this.tipoEmbalajeService.remove(+id);
    }

    @Get('nombre/:nombre')
    @ApiOperation({ summary: 'Get a tipo de embalaje by nombre' })
    @ApiResponse({
        status: 200,
        description: 'The tipo de embalaje',
        type: TipoEmbalajeEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findByNombre(@Param('nombre') nombre: string) {
        return this.tipoEmbalajeService.findByNombre(decodeURIComponent(nombre));
    }
}