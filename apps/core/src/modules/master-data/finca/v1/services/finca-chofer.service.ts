import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';

@Injectable()
export class FincaChoferService {
  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async validateIdsExist(fincaId: number, ids: number[]) {
    if (ids.length === 0) return;

    const existingRelations = await this.prisma.fincaChofer.findMany({
      where: {
        idFinca: fincaId,
        idFincasChoferes: { in: ids },
      },
    });

    const existingIds = existingRelations.map((r) => r.idFincasChoferes);
    const notFoundIds = ids.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new BadRequestException(
        `Las siguientes relaciones finca-chofer no existen: ${notFoundIds.join(', ')}`,
      );
    }
  }

  async updateExisting(relations: Array<{ id: number; idChofer?: number }>) {
    for (const relation of relations) {
      await this.prisma.fincaChofer.update({
        where: { idFincasChoferes: relation.id },
        data: {
          idChofer: relation.idChofer,
        },
      });
    }
  }

  async deleteNotIncluded(fincaId: number, includedIds: number[]) {
    await this.prisma.fincaChofer.deleteMany({
      where: {
        idFinca: fincaId,
        idFincasChoferes: { notIn: includedIds },
      },
    });
  }

  async createNew(fincaId: number, choferesIds: number[]) {
    if (choferesIds.length === 0) return null;

    // Verificar que los choferes existen
    const existingChoferes = await this.prisma.chofer.findMany({
      where: { id: { in: choferesIds } },
    });

    const existingChoferesIds = existingChoferes.map((c) => c.id);
    const notFoundChoferes = choferesIds.filter(
      (id) => !existingChoferesIds.includes(id),
    );

    if (notFoundChoferes.length > 0) {
      throw new BadRequestException(
        `Los siguientes choferes no existen: ${notFoundChoferes.join(', ')}`,
      );
    }

    // Verificar que no existan relaciones duplicadas
    const existingRelations = await this.prisma.fincaChofer.findMany({
      where: {
        idFinca: fincaId,
        idChofer: { in: choferesIds },
      },
    });

    const existingChoferesInRelation = existingRelations.map((r) => r.idChofer);
    const newChoferesIds = choferesIds.filter(
      (id) => !existingChoferesInRelation.includes(id),
    );

    if (newChoferesIds.length === 0) return null;

    return {
      create: newChoferesIds.map((idChofer) => ({
        idChofer,
      })),
    };
  }
}