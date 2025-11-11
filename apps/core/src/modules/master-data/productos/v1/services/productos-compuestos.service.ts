import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';

@Injectable()
export class ProductosCompuestosService {
  private readonly logger = new Logger(ProductosCompuestosService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async validateIdsExist(productId: number, compuestoIds: number[]) {
    if (compuestoIds.length === 0) return;

    const compuestosExistentes = await this.prisma.productosCompuesto.findMany({
      where: {
        id: { in: compuestoIds },
        productId: productId,
      },
    });

    if (compuestosExistentes.length !== compuestoIds.length) {
      throw new BadRequestException(
        'Uno o más IDs de productos compuestos no existen o no pertenecen a este producto',
      );
    }
  }

  async updateExisting(
    compuestoUpdates: Array<{
      id: number;
      destino?: string;
      declaracion?: string;
    }>,
  ) {
    if (compuestoUpdates.length === 0) return;

    const updatePromises = compuestoUpdates.map((compuesto) =>
      this.prisma.productosCompuesto.update({
        where: { id: compuesto.id },
        data: {
          destino: compuesto.destino?.trim(),
          declaracion: compuesto.declaracion?.trim(),
        },
      }),
    );

    await Promise.all(updatePromises);
    this.logger.log(
      `Actualizados ${compuestoUpdates.length} productos compuestos`,
    );
  }

  async deleteNotIncluded(productId: number, idsToKeep: number[]) {
    const compuestosActuales = await this.prisma.productosCompuesto.findMany({
      where: { productId },
    });

    const idsAEliminar = compuestosActuales
      .filter((c) => !idsToKeep.includes(c.id))
      .map((c) => c.id);

    if (idsAEliminar.length > 0) {
      await this.prisma.productosCompuesto.deleteMany({
        where: { id: { in: idsAEliminar } },
      });
      this.logger.log(
        `Eliminados ${idsAEliminar.length} productos compuestos no incluidos`,
      );
    }
  }

  async createNew(
    productId: number,
    newCompuestos: Array<{ destino?: string; declaracion?: string }>,
  ) {
    if (newCompuestos.length === 0) return null;

    const createData = {
      create: newCompuestos.map((compuesto) => ({
        destino: compuesto.destino?.trim(),
        declaracion: compuesto.declaracion?.trim(),
      })),
    };

    this.logger.log(
      `Creando ${newCompuestos.length} nuevos productos compuestos`,
    );
    return createData;
  }
}
