import type { Prisma } from '@internal/datos-maestros-client';
import type { LegacyDbService } from '../../../integrations/legacy-db/legacy-db.service';

/** Cliente de datos maestros dentro de la transacción de cada registro. */
export type Db = Prisma.TransactionClient;

/** Fila tal como la devuelve el legacy-bridge (node-adodb → JSON). */
export type AccessRow = Record<string, unknown>;

/** Fila de la bitácora `SyncLegacyRegistro` (existe igual en cada schema sincronizado). */
export interface RegistroSync {
  id: number;
  entidad: string;
  claveAccess: string;
  idPg: string | null;
  hash: string;
  vistoEn: Date;
  ausenteDesde: Date | null;
}

/**
 * Lo mínimo que el motor necesita de un PrismaClient: su bitácora y
 * transacciones. Lo cumplen el cliente de datos_maestros y el de documentos.
 */
export interface ClienteSync {
  syncLegacyRegistro: {
    findMany(args: { where: { entidad: string } }): Promise<RegistroSync[]>;
    updateMany(args: {
      where: { entidad: string; claveAccess: { in: string[] } };
      data: { vistoEn: Date };
    }): Promise<unknown>;
  };
  $transaction<T>(
    fn: (tx: any) => Promise<T>,
    options?: { timeout?: number; maxWait?: number },
  ): Promise<T>;
}

export type ModoSync = 'incremental' | 'completo';

export interface SyncContext {
  legacy: LegacyDbService;
  dryRun: boolean;
  /**
   * Reescribe todo aunque el hash no haya cambiado: corrige lo que se haya
   * editado o borrado a mano en PG (Access sigue siendo el que manda).
   */
  forzar: boolean;
  /**
   * incremental: las entidades con `incremental: true` leen solo lo reciente
   * o modificado desde `desde`; completo: todas leen todo.
   */
  modo: ModoSync;
  /** Inicio de la última corrida buena del grupo (para el modo incremental). */
  desde: Date | null;
  /**
   * id en PG de cada registro ya sincronizado: entidad → claveAccess → id.
   * También guarda índices auxiliares (ej. "aerolinea:iata" → código IATA → id).
   */
  ids: Map<string, Map<string, number>>;
}

/** Resultado de mapear una fila que no se puede escribir. */
export interface Omitido {
  omitir: string;
}

/**
 * Definición del sync de una entidad. El motor (`sync-engine.ts`) se encarga
 * de hashear, saltar lo que no cambió, escribir la bitácora y desactivar lo
 * que desaparece de Access; la entidad solo sabe leer, mapear y guardar.
 */
export interface EntidadSync<Row = AccessRow, Data = unknown, Tx = Db> {
  /** Nombre corto, se guarda en la bitácora (ej. "finca"). */
  entidad: string;
  /**
   * Lee las filas de origen (Access vía bridge o un catálogo fijo). Puede
   * devolver todo junto o por lotes (AsyncIterable) para tablas grandes.
   */
  leer(ctx: SyncContext): Promise<Row[]> | AsyncIterable<Row[]>;
  /**
   * true si en modo incremental `leer` trae solo una parte: en ese caso el
   * motor no desactiva lo que no vino (eso queda para la corrida completa).
   */
  incremental?: boolean;
  /** Clave del registro en Access, como texto. null = fila sin clave (se omite). */
  clave(row: Row): string | null;
  /** Datos a escribir en PG. Las FKs se resuelven con `ctx.ids`. Debe ser determinista. */
  mapear(row: Row, ctx: SyncContext): Data | Omitido;
  /**
   * Crea o actualiza el registro (y sus hijos) haciendo upsert por la clave
   * natural, y devuelve su id en PG (null si la tabla no tiene id numérico).
   */
  guardar(db: Tx, data: Data): Promise<number | null>;
  /** Qué hacer cuando el registro ya no está en Access (desactivar, borrar hijos…). */
  desactivar?(db: Tx, idPg: number): Promise<void>;
}

export interface ResumenEntidad {
  entidad: string;
  leidos: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  desactivados: number;
  omitidos: Array<{ clave: string; motivo: string }>;
  errores: Array<{ clave: string; error: string }>;
  /** Error que impidió procesar la entidad completa (ej. falló la lectura). */
  errorFatal?: string;
  ms: number;
}

export function esOmitido(x: unknown): x is Omitido {
  return typeof x === 'object' && x !== null && 'omitir' in x;
}
