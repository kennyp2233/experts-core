import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';

@Injectable()
export class ProductosMiProService {
  private readonly logger = new Logger(ProductosMiProService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) { }

  async validateIdsExist(productId: number, miProIds: number[]) {
    if (miProIds.length === 0) return;

    const miProsExistentes = await this.prisma.productosMiPro.findMany({
      where: {
        id: { in: miProIds },
        productId: productId,
      },
    });

    if (miProsExistentes.length !== miProIds.length) {
      throw new BadRequestException(
        'Uno o más IDs de productos MiPro no existen o no pertenecen a este producto',
      );
    }
  }

  async updateExisting(
    miProUpdates: Array<{
      id: number;
      acuerdo?: string;
      djoCode?: string;
      tariffCode?: string;
    }>,
  ) {
    if (miProUpdates.length === 0) return;

    const updatePromises = miProUpdates.map((miPro) =>
      this.prisma.productosMiPro.update({
        where: { id: miPro.id },
        data: {
          acuerdo: miPro.acuerdo?.trim(),
          djoCode: miPro.djoCode?.trim(),
          tariffCode: miPro.tariffCode?.trim(),
        },
      }),
    );

    await Promise.all(updatePromises);
    this.logger.log(`Actualizados ${miProUpdates.length} productos MiPro`);
  }

  async deleteNotIncluded(productId: number, idsToKeep: number[]) {
    const miProsActuales = await this.prisma.productosMiPro.findMany({
      where: { productId },
    });

    const idsAEliminar = miProsActuales
      .filter((m) => !idsToKeep.includes(m.id))
      .map((m) => m.id);

    if (idsAEliminar.length > 0) {
      await this.prisma.productosMiPro.deleteMany({
        where: { id: { in: idsAEliminar } },
      });
      this.logger.log(
        `Eliminados ${idsAEliminar.length} productos MiPro no incluidos`,
      );
    }
  }

  async createNew(
    productId: number,
    newMiPros: Array<{
      acuerdo?: string;
      djoCode?: string;
      tariffCode?: string;
    }>,
  ) {
    if (newMiPros.length === 0) return null;

    const createData = {
      create: newMiPros.map((miPro) => ({
        acuerdo: miPro.acuerdo?.trim(),
        djoCode: miPro.djoCode?.trim(),
        tariffCode: miPro.tariffCode?.trim(),
      })),
    };

    this.logger.log(`Creando ${newMiPros.length} nuevos productos MiPro`);
    return createData;
  }
}
