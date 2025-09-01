import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { CryptoUtils } from '../../../utils/crypto.utils';

@Injectable()
export class DepotSecretService {
  private readonly logger = new Logger(DepotSecretService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Genera un nuevo secreto criptográfico único para el depot
   */
  async regenerateSecret(depotId: string): Promise<{
    id: string;
    secretUpdatedAt: Date;
  }> {
    // Verificar que el depot existe
    const existingDepot = await this.prisma.depot.findUnique({
      where: { id: depotId }
    });

    if (!existingDepot) {
      throw new NotFoundException(`Depot con ID ${depotId} no encontrado`);
    }

    let newSecret: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Generar secreto único (máximo 10 intentos)
    while (!isUnique && attempts < maxAttempts) {
      newSecret = CryptoUtils.generateDepotSecret();
      
      const existingWithSecret = await this.prisma.depot.findUnique({
        where: { secret: newSecret }
      });

      if (!existingWithSecret) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('No se pudo generar un secreto único después de múltiples intentos');
    }

    // Actualizar el depot con el nuevo secreto
    const updatedDepot = await this.prisma.depot.update({
      where: { id: depotId },
      data: {
        secret: newSecret!,
        secretUpdatedAt: new Date()
      },
      select: {
        id: true,
        secretUpdatedAt: true
      }
    });

    this.logger.log(`Secreto regenerado para depot ${depotId}`);

    return updatedDepot;
  }

  /**
   * Genera un secreto inicial para un nuevo depot
   */
  async generateInitialSecret(): Promise<string> {
    let newSecret: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      newSecret = CryptoUtils.generateDepotSecret();
      
      const existingWithSecret = await this.prisma.depot.findUnique({
        where: { secret: newSecret }
      });

      if (!existingWithSecret) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('No se pudo generar un secreto único para el nuevo depot');
    }

    return newSecret!;
  }

  /**
   * Valida si un secreto es único en el sistema
   */
  async isSecretUnique(secret: string, excludeDepotId?: string): Promise<boolean> {
    const existingDepot = await this.prisma.depot.findUnique({
      where: { secret }
    });

    if (!existingDepot) {
      return true;
    }

    // Si excluimos un depot específico, verificar que no sea el mismo
    if (excludeDepotId && existingDepot.id === excludeDepotId) {
      return true;
    }

    return false;
  }
}
