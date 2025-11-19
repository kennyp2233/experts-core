import { PrismaService } from '../../../prisma.service';

/**
 * Generador de IDs de empleado automáticos
 *
 * Formatos soportados:
 * - SEQUENTIAL: EMP-00001, EMP-00002, ...
 * - DEPOT_SEQUENTIAL: DEP001-001, DEP001-002, ...
 * - YEAR_SEQUENTIAL: 2025-001, 2025-002, ...
 * - CUSTOM: Formato personalizado con placeholders
 */

export enum EmployeeIdFormat {
  SEQUENTIAL = 'SEQUENTIAL', // EMP-00001
  DEPOT_SEQUENTIAL = 'DEPOT_SEQUENTIAL', // {DEPOT_CODE}-001
  YEAR_SEQUENTIAL = 'YEAR_SEQUENTIAL', // YYYY-001
  CUSTOM = 'CUSTOM', // Custom format with placeholders
}

export interface EmployeeIdConfig {
  format: EmployeeIdFormat;
  prefix?: string; // e.g., "EMP", "WORKER"
  digits?: number; // Number of digits for sequential part (default: 5)
  customTemplate?: string; // For CUSTOM format: "{DEPOT}-{YEAR}-{SEQ}"
}

/**
 * Generador de IDs de empleado
 */
export class EmployeeIdGenerator {
  private static readonly DEFAULT_CONFIG: EmployeeIdConfig = {
    format: EmployeeIdFormat.SEQUENTIAL,
    prefix: 'EMP',
    digits: 5,
  };

  /**
   * Generar nuevo ID de empleado único
   */
  static async generate(
    prisma: PrismaService,
    config: Partial<EmployeeIdConfig> = {},
    depotCode?: string,
  ): Promise<string> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    switch (finalConfig.format) {
      case EmployeeIdFormat.SEQUENTIAL:
        return this.generateSequential(prisma, finalConfig);

      case EmployeeIdFormat.DEPOT_SEQUENTIAL:
        if (!depotCode) {
          throw new Error('Depot code is required for DEPOT_SEQUENTIAL format');
        }
        return this.generateDepotSequential(prisma, depotCode, finalConfig);

      case EmployeeIdFormat.YEAR_SEQUENTIAL:
        return this.generateYearSequential(prisma, finalConfig);

      case EmployeeIdFormat.CUSTOM:
        if (!finalConfig.customTemplate) {
          throw new Error('Custom template is required for CUSTOM format');
        }
        return this.generateCustom(prisma, finalConfig, depotCode);

      default:
        return this.generateSequential(prisma, finalConfig);
    }
  }

  /**
   * Formato: EMP-00001, EMP-00002, ...
   */
  private static async generateSequential(
    prisma: PrismaService,
    config: EmployeeIdConfig,
  ): Promise<string> {
    const prefix = config.prefix || 'EMP';
    const digits = config.digits || 5;

    // Buscar el último ID con este prefijo
    const lastWorker = await prisma.worker.findFirst({
      where: {
        employeeId: {
          startsWith: `${prefix}-`,
        },
      },
      orderBy: {
        employeeId: 'desc',
      },
    });

    let nextNumber = 1;

    if (lastWorker) {
      // Extraer número del último ID
      const match = lastWorker.employeeId.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNumber = nextNumber.toString().padStart(digits, '0');
    return `${prefix}-${paddedNumber}`;
  }

  /**
   * Formato: DEP001-001, DEP001-002, ...
   */
  private static async generateDepotSequential(
    prisma: PrismaService,
    depotCode: string,
    config: EmployeeIdConfig,
  ): Promise<string> {
    const digits = config.digits || 3;

    // Buscar el último trabajador de este depot
    const lastWorker = await prisma.worker.findFirst({
      where: {
        employeeId: {
          startsWith: `${depotCode}-`,
        },
      },
      orderBy: {
        employeeId: 'desc',
      },
    });

    let nextNumber = 1;

    if (lastWorker) {
      const match = lastWorker.employeeId.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNumber = nextNumber.toString().padStart(digits, '0');
    return `${depotCode}-${paddedNumber}`;
  }

  /**
   * Formato: 2025-001, 2025-002, ...
   */
  private static async generateYearSequential(
    prisma: PrismaService,
    config: EmployeeIdConfig,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const digits = config.digits || 3;

    // Buscar el último trabajador de este año
    const lastWorker = await prisma.worker.findFirst({
      where: {
        employeeId: {
          startsWith: `${year}-`,
        },
      },
      orderBy: {
        employeeId: 'desc',
      },
    });

    let nextNumber = 1;

    if (lastWorker) {
      const match = lastWorker.employeeId.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNumber = nextNumber.toString().padStart(digits, '0');
    return `${year}-${paddedNumber}`;
  }

  /**
   * Formato custom con placeholders:
   * - {YEAR}: 2025
   * - {MONTH}: 01-12
   * - {DEPOT}: Código del depot
   * - {SEQ}: Número secuencial
   * - {PREFIX}: Prefijo personalizado
   *
   * Ejemplo: "{DEPOT}-{YEAR}-{SEQ}" → "DEP001-2025-001"
   */
  private static async generateCustom(
    prisma: PrismaService,
    config: EmployeeIdConfig,
    depotCode?: string,
  ): Promise<string> {
    const template = config.customTemplate!;
    const digits = config.digits || 3;
    const now = new Date();

    // Crear patrón de búsqueda reemplazando placeholders dinámicos
    let searchPattern = template
      .replace('{YEAR}', now.getFullYear().toString())
      .replace('{MONTH}', (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace('{DEPOT}', depotCode || 'XXX')
      .replace('{PREFIX}', config.prefix || 'EMP');

    // Reemplazar {SEQ} con patrón de búsqueda
    const seqPattern = searchPattern.replace('{SEQ}', '');

    // Buscar últimos trabajadores con este patrón
    const lastWorker = await prisma.worker.findFirst({
      where: {
        employeeId: {
          startsWith: seqPattern,
        },
      },
      orderBy: {
        employeeId: 'desc',
      },
    });

    let nextNumber = 1;

    if (lastWorker) {
      // Extraer número secuencial del último ID
      const match = lastWorker.employeeId.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNumber = nextNumber.toString().padStart(digits, '0');

    // Generar ID final
    return template
      .replace('{YEAR}', now.getFullYear().toString())
      .replace('{MONTH}', (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace('{DEPOT}', depotCode || 'XXX')
      .replace('{PREFIX}', config.prefix || 'EMP')
      .replace('{SEQ}', paddedNumber);
  }

  /**
   * Validar que un ID sea único
   */
  static async isUnique(prisma: PrismaService, employeeId: string): Promise<boolean> {
    const existing = await prisma.worker.findUnique({
      where: { employeeId },
    });

    return !existing;
  }

  /**
   * Generar ID garantizando unicidad (retry logic)
   */
  static async generateUnique(
    prisma: PrismaService,
    config: Partial<EmployeeIdConfig> = {},
    depotCode?: string,
    maxRetries = 5,
  ): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const employeeId = await this.generate(prisma, config, depotCode);

      if (await this.isUnique(prisma, employeeId)) {
        return employeeId;
      }

      // Si no es único, esperar un poco y reintentar
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Failed to generate unique employee ID after ${maxRetries} attempts`);
  }
}
