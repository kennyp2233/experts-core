import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';

@Injectable()
export class FincaProductoService {
  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) { }

  async validateIdsExist(fincaId: number, ids: number[]) {
    if (ids.length === 0) return;

    const existingRelations = await this.prisma.fincaProducto.findMany({
      where: {
        idFinca: fincaId,
        idFincasProductos: { in: ids },
      },
    });

    const existingIds = existingRelations.map((r) => r.idFincasProductos);
    const notFoundIds = ids.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new BadRequestException(
        `Las siguientes relaciones finca-producto no existen: ${notFoundIds.join(', ')}`,
      );
    }
  }

  async updateExisting(relations: Array<{ id: number; idProducto?: number }>) {
    for (const relation of relations) {
      await this.prisma.fincaProducto.update({
        where: { idFincasProductos: relation.id },
        data: {
          idProducto: relation.idProducto,
        },
      });
    }
  }

  async deleteNotIncluded(fincaId: number, includedIds: number[]) {
    await this.prisma.fincaProducto.deleteMany({
      where: {
        idFinca: fincaId,
        idFincasProductos: { notIn: includedIds },
      },
    });
  }

  async createNew(fincaId: number, productosIds: number[]) {
    if (productosIds.length === 0) return null;

    // Verificar que los productos existen
    const existingProductos = await this.prisma.producto.findMany({
      where: { id: { in: productosIds } },
    });

    const existingProductosIds = existingProductos.map((p) => p.id);
    const notFoundProductos = productosIds.filter(
      (id) => !existingProductosIds.includes(id),
    );

    if (notFoundProductos.length > 0) {
      throw new BadRequestException(
        `Los siguientes productos no existen: ${notFoundProductos.join(', ')}`,
      );
    }

    // Verificar que no existan relaciones duplicadas
    const existingRelations = await this.prisma.fincaProducto.findMany({
      where: {
        idFinca: fincaId,
        idProducto: { in: productosIds },
      },
    });

    const existingProductosInRelation = existingRelations.map((r) => r.idProducto);
    const newProductosIds = productosIds.filter(
      (id) => !existingProductosInRelation.includes(id),
    );

    if (newProductosIds.length === 0) return null;

    return {
      create: newProductosIds.map((idProducto) => ({
        idProducto,
      })),
    };
  }
}