import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateProductoDto, UpdateProductoDto } from './dto';
import { ProductosRelacionesService } from './services';

@Injectable()
export class ProductosService {
  private readonly logger = new Logger(ProductosService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    private relacionesService: ProductosRelacionesService,
  ) { }

  async create(createProductoDto: CreateProductoDto) {
    try {
      if (!createProductoDto.nombre || createProductoDto.nombre.trim() === '') {
        throw new BadRequestException('El nombre del producto es requerido');
      }

      const producto = await this.prisma.producto.create({
        data: {
          nombre: createProductoDto.nombre.trim(),
          descripcion: createProductoDto.descripcion?.trim(),
          nombreBotanico: createProductoDto.nombreBotanico?.trim(),
          especie: createProductoDto.especie?.trim(),
          medidaId: createProductoDto.medidaId,
          precioUnitario: createProductoDto.precioUnitario
            ? parseFloat(createProductoDto.precioUnitario)
            : null,
          estado: createProductoDto.estado ?? true,
          opcionId: createProductoDto.opcionId,
          stemsPorFull: createProductoDto.stemsPorFull,
          sesaId: createProductoDto.sesaId,
          // Crear relaciones anidadas si se proporcionan
          ...(createProductoDto.productosAranceles && {
            productosAranceles: {
              create: createProductoDto.productosAranceles.map((arancel) => ({
                arancelesDestino: arancel.arancelesDestino?.trim(),
                arancelesCodigo: arancel.arancelesCodigo?.trim(),
              })),
            },
          }),
          ...(createProductoDto.productosCompuestos && {
            productosCompuestos: {
              create: createProductoDto.productosCompuestos.map(
                (compuesto) => ({
                  destino: compuesto.destino?.trim(),
                  declaracion: compuesto.declaracion?.trim(),
                }),
              ),
            },
          }),
          ...(createProductoDto.productosMiPros && {
            productosMiPros: {
              create: createProductoDto.productosMiPros.map((miPro) => ({
                acuerdo: miPro.acuerdo?.trim(),
                djoCode: miPro.djoCode?.trim(),
                tariffCode: miPro.tariffCode?.trim(),
              })),
            },
          }),
        },
        include: {
          productosAranceles: true,
          productosCompuestos: true,
          productosMiPros: true,
        },
      });

      this.logger.log(`Producto creado: ${producto.id} - ${producto.nombre}`);
      return producto;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al crear producto: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al crear producto');
    }
  }

  async findAll(skip?: number, take?: number, search?: string) {
    try {
      const where: any = {};

      if (search) {
        where.nombre = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const [productos, total] = await Promise.all([
        this.prisma.producto.findMany({
          skip,
          take,
          where,
          include: {
            productosAranceles: true,
            productosCompuestos: true,
            productosMiPros: true,
            medida: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.producto.count({ where }),
      ]);

      return {
        data: productos,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener productos: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener productos');
    }
  }

  async findOne(id: number) {
    try {
      const producto = await this.prisma.producto.findUnique({
        where: { id },
        include: {
          productosAranceles: true,
          productosCompuestos: true,
          productosMiPros: true,
        },
      });

      if (!producto) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }

      return producto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener producto: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener producto');
    }
  }

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    try {
      const producto = await this.prisma.producto.findUnique({
        where: { id },
      });

      if (!producto) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }

      // Construir el objeto data dinámicamente
      const updateData: any = {};

      // Actualizar campos del producto
      if (updateProductoDto.nombre) {
        updateData.nombre = updateProductoDto.nombre.trim();
      }
      if (updateProductoDto.descripcion !== undefined) {
        updateData.descripcion = updateProductoDto.descripcion?.trim();
      }
      if (updateProductoDto.nombreBotanico !== undefined) {
        updateData.nombreBotanico = updateProductoDto.nombreBotanico?.trim();
      }
      if (updateProductoDto.especie !== undefined) {
        updateData.especie = updateProductoDto.especie?.trim();
      }
      if (updateProductoDto.medidaId !== undefined) {
        updateData.medidaId = updateProductoDto.medidaId;
      }
      if (updateProductoDto.precioUnitario !== undefined) {
        updateData.precioUnitario = updateProductoDto.precioUnitario
          ? parseFloat(updateProductoDto.precioUnitario)
          : null;
      }
      if (updateProductoDto.estado !== undefined) {
        updateData.estado = updateProductoDto.estado;
      }
      if (updateProductoDto.opcionId !== undefined) {
        updateData.opcionId = updateProductoDto.opcionId;
      }
      if (updateProductoDto.stemsPorFull !== undefined) {
        updateData.stemsPorFull = updateProductoDto.stemsPorFull;
      }
      if (updateProductoDto.sesaId !== undefined) {
        updateData.sesaId = updateProductoDto.sesaId;
      }

      // Manejar todas las relaciones usando el servicio modular
      const relacionesData =
        await this.relacionesService.handleAllRelacionesUpdate(
          id,
          updateProductoDto.productosAranceles,
          updateProductoDto.productosCompuestos,
          updateProductoDto.productosMiPros,
        );

      // Combinar datos del producto con datos de relaciones
      Object.assign(updateData, relacionesData);

      const updatedProducto = await this.prisma.producto.update({
        where: { id },
        data: updateData,
        include: {
          productosAranceles: true,
          productosCompuestos: true,
          productosMiPros: true,
        },
      });

      this.logger.log(
        `Producto actualizado: ${id} - ${updatedProducto.nombre}`,
      );
      return updatedProducto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar producto: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar producto');
    }
  }

  async remove(id: number) {
    try {
      const producto = await this.prisma.producto.findUnique({
        where: { id },
      });

      if (!producto) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }

      await this.prisma.producto.delete({
        where: { id },
      });

      this.logger.log(`Producto eliminado: ${id} - ${producto.nombre}`);
      return { message: `Producto ${producto.nombre} eliminado exitosamente` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar producto: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar producto');
    }
  }

  async findByName(nombre: string) {
    try {
      const productos = await this.prisma.producto.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        include: {
          productosAranceles: true,
          productosCompuestos: true,
          productosMiPros: true,
        },
      });

      return productos;
    } catch (error) {
      this.logger.error(
        `Error al buscar productos: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar productos');
    }
  }
}
