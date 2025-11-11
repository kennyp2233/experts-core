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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CaeAduanaService } from './cae-aduana.service';
import {
  CreateCaeAduanaDto,
  UpdateCaeAduanaDto,
  PaginationResponseDto,
} from './dto';
import { CaeAduanaEntity } from './entities';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';

@ApiTags('Master Data - CAE Aduanas')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto, CaeAduanaEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'master-data/cae-aduanas',
  version: '1',
})
export class CaeAduanaController {
  constructor(private readonly caeAduanaService: CaeAduanaService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo CAE Aduana' })
  @ApiResponse({
    status: 201,
    description: 'CAE Aduana creado exitosamente',
    type: CaeAduanaEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createCaeAduanaDto: CreateCaeAduanaDto) {
    return this.caeAduanaService.create(createCaeAduanaDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Obtener todos los CAE Aduanas' })
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
    description: 'Lista paginada de CAE Aduanas',
    type: PaginationResponseDto<CaeAduanaEntity>,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.caeAduanaService.findAll(skipNum, takeNum);
  }

  @Roles(UserRole.ADMIN)
  @Get('search')
  @ApiOperation({ summary: 'Buscar CAE Aduanas por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre o parte del nombre del CAE Aduana',
  })
  @ApiResponse({
    status: 200,
    description: 'CAE Aduanas encontrados',
    isArray: true,
    type: CaeAduanaEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async search(@Query('nombre') nombre: string) {
    return this.caeAduanaService.findByName(nombre);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un CAE Aduana por ID' })
  @ApiResponse({
    status: 200,
    description: 'CAE Aduana encontrado',
    type: CaeAduanaEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'CAE Aduana no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.caeAduanaService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un CAE Aduana' })
  @ApiResponse({
    status: 200,
    description: 'CAE Aduana actualizado exitosamente',
    type: CaeAduanaEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'CAE Aduana no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCaeAduanaDto: UpdateCaeAduanaDto,
  ) {
    return this.caeAduanaService.update(id, updateCaeAduanaDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un CAE Aduana' })
  @ApiResponse({
    status: 200,
    description: 'CAE Aduana eliminado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'CAE Aduana no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.caeAduanaService.remove(id);
  }
}
