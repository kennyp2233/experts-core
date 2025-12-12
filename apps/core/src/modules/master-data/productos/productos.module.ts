import { Module } from '@nestjs/common';
import { ProductosController } from './v1/productos.controller';
import { ProductosService } from './v1/productos.service';
import {
  ProductosArancelesService,
  ProductosCompuestosService,
  ProductosMiProService,
  ProductosRelacionesService,
} from './v1/services';

@Module({
  providers: [
    ProductosService,
    ProductosArancelesService,
    ProductosCompuestosService,
    ProductosMiProService,
    ProductosRelacionesService,
      ],
  controllers: [ProductosController],
  exports: [ProductosService],
})
export class ProductosModule {}

