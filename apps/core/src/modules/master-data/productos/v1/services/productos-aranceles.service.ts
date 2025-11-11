import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';

@Injectable()
export class ProductosArancelesService {
  private readonly logger = new Logger(ProductosArancelesService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async validateIdsExist(productId: number, arancelIds: number[]) {
    if (arancelIds.length === 0) return;

    const arancelesExistentes = await this.prisma.productosAranceles.findMany({
      where: {
        id: { in: arancelIds },
        productId: productId,
      },
    });

    if (arancelesExistentes.length !== arancelIds.length) {
      throw new BadRequestException(
        'Uno o más IDs de aranceles no existen o no pertenecen a este producto',
      );
    }
  }

  async updateExisting(
    arancelUpdates: Array<{
      id: number;
      arancelesDestino?: string;
      arancelesCodigo?: string;
    }>,
  ) {
    if (arancelUpdates.length === 0) return;

    const updatePromises = arancelUpdates.map((arancel) =>
      this.prisma.productosAranceles.update({
        where: { id: arancel.id },
        data: {
          arancelesDestino: arancel.arancelesDestino?.trim(),
          arancelesCodigo: arancel.arancelesCodigo?.trim(),
        },
      }),
    );

    await Promise.all(updatePromises);
    this.logger.log(`Actualizados ${arancelUpdates.length} aranceles`);
  }

  async deleteNotIncluded(productId: number, idsToKeep: number[]) {
    const arancelesActuales = await this.prisma.productosAranceles.findMany({
      where: { productId },
    });

    const idsAEliminar = arancelesActuales
      .filter((a) => !idsToKeep.includes(a.id))
      .map((a) => a.id);

    if (idsAEliminar.length > 0) {
      await this.prisma.productosAranceles.deleteMany({
        where: { id: { in: idsAEliminar } },
      });
      this.logger.log(
        `Eliminados ${idsAEliminar.length} aranceles no incluidos`,
      );
    }
  }

  async createNew(
    productId: number,
    newAranceles: Array<{
      arancelesDestino?: string;
      arancelesCodigo?: string;
    }>,
  ) {
    if (newAranceles.length === 0) return null;

    const createData = {
      create: newAranceles.map((arancel) => ({
        arancelesDestino: arancel.arancelesDestino?.trim(),
        arancelesCodigo: arancel.arancelesCodigo?.trim(),
      })),
    };

    this.logger.log(`Creando ${newAranceles.length} nuevos aranceles`);
    return createData;
  }
}
