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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { BodegueroService } from './services/bodeguero.service';
import { CreateBodegueroDto, UpdateBodegueroDto } from './dto';
import { Bodeguero } from './entities/bodeguero.entity';

@ApiTags('bodeguero')
@ApiBearerAuth()
@Controller({
  path: 'master-data/bodeguero',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BodegueroController {
  constructor(private readonly bodegueroService: BodegueroService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bodeguero' })
  @ApiResponse({
    status: 201,
    description: 'The bodeguero has been successfully created.',
    type: Bodeguero,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createDto: CreateBodegueroDto) {
    return this.bodegueroService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bodegueros' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Número de registros a saltar' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Número de registros a obtener' })
  @ApiResponse({
    status: 200,
    description: 'List of all bodegueros',
    type: [Bodeguero],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.bodegueroService.findAll(skipNum, takeNum);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search bodegueros by nombre' })
  @ApiQuery({ name: 'nombre', required: true, type: String, description: 'Nombre a buscar' })
  @ApiResponse({
    status: 200,
    description: 'Bodegueros encontrados',
    type: [Bodeguero],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  search(@Query('nombre') nombre: string) {
    return this.bodegueroService.findByNombre(nombre);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bodeguero by ID' })
  @ApiResponse({
    status: 200,
    description: 'The bodeguero data',
    type: Bodeguero,
  })
  @ApiResponse({ status: 404, description: 'Bodeguero not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string) {
    return this.bodegueroService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bodeguero' })
  @ApiResponse({
    status: 200,
    description: 'The bodeguero has been successfully updated.',
    type: Bodeguero,
  })
  @ApiResponse({ status: 404, description: 'Bodeguero not found' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBodegueroDto,
  ) {
    return this.bodegueroService.update(+id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bodeguero' })
  @ApiResponse({
    status: 204,
    description: 'The bodeguero has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Bodeguero not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string) {
    return this.bodegueroService.remove(+id);
  }
}