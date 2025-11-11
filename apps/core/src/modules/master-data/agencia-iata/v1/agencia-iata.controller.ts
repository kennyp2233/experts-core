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
import { AgenciaIataService } from './services/agencia-iata.service';
import { CreateAgenciaIataDto, UpdateAgenciaIataDto } from './dto';
import { AgenciaIataEntity } from './entities/agencia-iata.entity';

@ApiTags('agencia-iata')
@Controller({
  path: 'master-data/agencia-iata',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AgenciaIataController {
    constructor(private readonly agenciaIataService: AgenciaIataService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new agencia IATA' })
    @ApiResponse({
        status: 201,
        description: 'The agencia IATA has been successfully created.',
        type: AgenciaIataEntity,
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(@Body() createDto: CreateAgenciaIataDto) {
        return this.agenciaIataService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all agencias IATA' })
    @ApiResponse({
        status: 200,
        description: 'List of all agencias IATA',
        type: [AgenciaIataEntity],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll() {
        return this.agenciaIataService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a agencia IATA by ID' })
    @ApiResponse({
        status: 200,
        description: 'The agencia IATA',
        type: AgenciaIataEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findOne(@Param('id') id: string) {
        return this.agenciaIataService.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a agencia IATA' })
    @ApiResponse({
        status: 200,
        description: 'The agencia IATA has been successfully updated.',
        type: AgenciaIataEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    update(@Param('id') id: string, @Body() updateDto: UpdateAgenciaIataDto) {
        return this.agenciaIataService.update(+id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a agencia IATA (soft delete)' })
    @ApiResponse({
        status: 200,
        description: 'The agencia IATA has been successfully deleted.',
        type: AgenciaIataEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    remove(@Param('id') id: string) {
        return this.agenciaIataService.remove(+id);
    }

    @Get('nombre/:nombre')
    @ApiOperation({ summary: 'Get a agencia IATA by nombre shipper' })
    @ApiResponse({
        status: 200,
        description: 'The agencia IATA',
        type: AgenciaIataEntity,
    })
    @ApiResponse({ status: 404, description: 'Not Found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findByNombreShipper(@Param('nombre') nombre: string) {
        return this.agenciaIataService.findByNombreShipper(decodeURIComponent(nombre));
    }
}