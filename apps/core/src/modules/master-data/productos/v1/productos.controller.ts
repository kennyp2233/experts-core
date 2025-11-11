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
import { ProductosService } from './productos.service';
import {
  CreateProductoDto,
  UpdateProductoDto,
  PaginationResponseDto,
} from './dto';
import { ProductoEntity } from './entities';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';

@ApiTags('Master Data - Productos')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto, ProductoEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'master-data/productos',
  version: '1',
})
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiResponse({
    status: 201,
    description: 'Producto creado exitosamente',
    type: ProductoEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos' })
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
    description: 'Lista paginada de productos',
    type: PaginationResponseDto<ProductoEntity>,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.productosService.findAll(skipNum, takeNum);
  }

  @Roles(UserRole.ADMIN)
  @Get('search')
  @ApiOperation({ summary: 'Buscar productos por nombre' })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre o parte del nombre del producto',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos encontrados',
    isArray: true,
    type: ProductoEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async search(@Query('nombre') nombre: string) {
    return this.productosService.findByName(nombre);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiResponse({
    status: 200,
    description: 'Producto encontrado',
    type: ProductoEntity,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente',
    type: ProductoEntity,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un producto' })
  @ApiResponse({
    status: 200,
    description: 'Producto eliminado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.remove(id);
  }
}
