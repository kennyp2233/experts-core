import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { FincaChoferService } from './finca-chofer.service';
import { FincaProductoService } from './finca-producto.service';

@Injectable()
export class FincaRelacionesService {
  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    private choferService: FincaChoferService,
    private productoService: FincaProductoService,
  ) { }

  async handleChoferesUpdate(fincaId: number, choferesIds?: number[]) {
    if (!choferesIds) return null;

    // Para las relaciones de choferes, tratamos cada ID como una nueva relación
    // No hay IDs de relación existentes en el DTO, solo IDs de choferes
    return await this.choferService.createNew(fincaId, choferesIds);
  }

  async handleProductosUpdate(fincaId: number, productosIds?: number[]) {
    if (!productosIds) return null;

    // Para las relaciones de productos, tratamos cada ID como una nueva relación
    // No hay IDs de relación existentes en el DTO, solo IDs de productos
    return await this.productoService.createNew(fincaId, productosIds);
  }

  async handleAllRelacionesUpdate(
    fincaId: number,
    choferesIds?: number[],
    productosIds?: number[],
  ) {
    const updateData: any = {};

    // Manejar relaciones con choferes
    const choferesData = await this.handleChoferesUpdate(fincaId, choferesIds);
    if (choferesData) updateData.fincasChoferes = choferesData;

    // Manejar relaciones con productos
    const productosData = await this.handleProductosUpdate(fincaId, productosIds);
    if (productosData) updateData.fincasProductos = productosData;

    return updateData;
  }

  async handleRelacionesUpdateForExistingFinca(
    fincaId: number,
    choferesIds?: number[],
    productosIds?: number[],
  ) {
    // Para actualizaciones, necesitamos manejar las relaciones existentes
    // Si se proporcionan IDs, reemplazamos todas las relaciones existentes

    if (choferesIds !== undefined) {
      // Eliminar todas las relaciones existentes de choferes
      await this.prisma.fincaChofer.deleteMany({
        where: { idFinca: fincaId },
      });

      // Crear nuevas relaciones si se proporcionaron IDs
      if (choferesIds.length > 0) {
        const choferesData = await this.choferService.createNew(fincaId, choferesIds);
        if (choferesData) {
          await this.prisma.finca.update({
            where: { id: fincaId },
            data: { fincasChoferes: choferesData },
          });
        }
      }
    }

    if (productosIds !== undefined) {
      // Eliminar todas las relaciones existentes de productos
      await this.prisma.fincaProducto.deleteMany({
        where: { idFinca: fincaId },
      });

      // Crear nuevas relaciones si se proporcionaron IDs
      if (productosIds.length > 0) {
        const productosData = await this.productoService.createNew(fincaId, productosIds);
        if (productosData) {
          await this.prisma.finca.update({
            where: { id: fincaId },
            data: { fincasProductos: productosData },
          });
        }
      }
    }
  }
}