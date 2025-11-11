import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { ProductosArancelesService } from './productos-aranceles.service';
import { ProductosCompuestosService } from './productos-compuestos.service';
import { ProductosMiProService } from './productos-mi-pro.service';
import {
  ProductosArancelesDto,
  ProductosCompuestoDto,
  ProductosMiProDto,
} from '../dto';

@Injectable()
export class ProductosRelacionesService {
  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    private arancelesService: ProductosArancelesService,
    private compuestosService: ProductosCompuestosService,
    private miProService: ProductosMiProService,
  ) {}

  async handleArancelesUpdate(
    productId: number,
    aranceles?: ProductosArancelesDto[],
  ) {
    if (!aranceles) return null;

    const arancelesConId = aranceles.filter((a) => a.id);
    const arancelesSinId = aranceles.filter((a) => !a.id);

    // Validar IDs existentes
    await this.arancelesService.validateIdsExist(
      productId,
      arancelesConId.map((a) => a.id),
    );

    // Actualizar existentes
    await this.arancelesService.updateExisting(
      arancelesConId as Array<{
        id: number;
        arancelesDestino?: string;
        arancelesCodigo?: string;
      }>,
    );

    // Eliminar no incluidos
    await this.arancelesService.deleteNotIncluded(
      productId,
      arancelesConId.map((a) => a.id),
    );

    // Crear nuevos
    return await this.arancelesService.createNew(productId, arancelesSinId);
  }

  async handleCompuestosUpdate(
    productId: number,
    compuestos?: ProductosCompuestoDto[],
  ) {
    if (!compuestos) return null;

    const compuestosConId = compuestos.filter((c) => c.id);
    const compuestosSinId = compuestos.filter((c) => !c.id);

    // Validar IDs existentes
    await this.compuestosService.validateIdsExist(
      productId,
      compuestosConId.map((c) => c.id),
    );

    // Actualizar existentes
    await this.compuestosService.updateExisting(
      compuestosConId as Array<{
        id: number;
        destino?: string;
        declaracion?: string;
      }>,
    );

    // Eliminar no incluidos
    await this.compuestosService.deleteNotIncluded(
      productId,
      compuestosConId.map((c) => c.id),
    );

    // Crear nuevos
    return await this.compuestosService.createNew(productId, compuestosSinId);
  }

  async handleMiProUpdate(productId: number, miPros?: ProductosMiProDto[]) {
    if (!miPros) return null;

    const miProsConId = miPros.filter((m) => m.id);
    const miProsSinId = miPros.filter((m) => !m.id);

    // Validar IDs existentes
    await this.miProService.validateIdsExist(
      productId,
      miProsConId.map((m) => m.id),
    );

    // Actualizar existentes
    await this.miProService.updateExisting(
      miProsConId as Array<{
        id: number;
        acuerdo?: string;
        djoCode?: string;
        tariffCode?: string;
      }>,
    );

    // Eliminar no incluidos
    await this.miProService.deleteNotIncluded(
      productId,
      miProsConId.map((m) => m.id),
    );

    // Crear nuevos
    return await this.miProService.createNew(productId, miProsSinId);
  }

  async handleAllRelacionesUpdate(
    productId: number,
    aranceles?: ProductosArancelesDto[],
    compuestos?: ProductosCompuestoDto[],
    miPros?: ProductosMiProDto[],
  ) {
    const updateData: any = {};

    // Manejar cada tipo de relación
    const arancelesData = await this.handleArancelesUpdate(
      productId,
      aranceles,
    );
    if (arancelesData) updateData.productosAranceles = arancelesData;

    const compuestosData = await this.handleCompuestosUpdate(
      productId,
      compuestos,
    );
    if (compuestosData) updateData.productosCompuestos = compuestosData;

    const miProsData = await this.handleMiProUpdate(productId, miPros);
    if (miProsData) updateData.productosMiPros = miProsData;

    return updateData;
  }
}
