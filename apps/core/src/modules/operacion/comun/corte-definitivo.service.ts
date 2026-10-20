import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { LegacyDbService } from '../../integrations/legacy-db/legacy-db.service';
import { modoOperacion } from './modo-operacion';

/** Contadores del sistema nuevo que siguen una serie del sistema viejo. */
const CONTADORES = {
  coordinacion: 'N° de coordinación (PIN_MCoordina.docNumero, docTipo COO)',
  CGU: 'N° de ingreso de guías (PIN_MCoordina.docNumero, docTipo CGU)',
  guiaHija: 'N° de guía hija (eBodega.bodNGH / PIN_DCoordina.detGuiaHija)',
} as const;
type ClaveContador = keyof typeof CONTADORES;

export interface EstadoCorte {
  modo: 'sombra' | 'activo';
  /** Si el bridge respondió (sin él no se puede alinear). */
  accessDisponible: boolean;
  contadores: Array<{
    clave: ClaveContador;
    descripcion: string;
    /** Último número usado en el sistema nuevo (null = todavía no se usó). */
    actual: number | null;
    /** Último número usado en Access. */
    ultimoAccess: number | null;
    /** El siguiente número que daría el sistema nuevo después de alinear. */
    siguienteAlAlinear: number | null;
  }>;
  pasos: string[];
}

/**
 * Corte definitivo (paso de `OPERACION_MODO=sombra` a `activo`): en sombra el
 * sistema nuevo numera en rangos propios (coordinaciones 900.000, CGU-0900000,
 * guías hijas 90.000.000) para no chocar con Access. Al corte, para que la
 * numeración siga la del sistema viejo, se alinean los contadores con el último
 * número de Access (solo lectura por el bridge). Los números de sombra ya
 * usados quedan como están (están lejos de la serie de Access).
 */
@Injectable()
export class CorteDefinitivoService {
  private readonly logger = new Logger(CorteDefinitivoService.name);

  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    private readonly legacy: LegacyDbService,
  ) {}

  async estado(): Promise<EstadoCorte> {
    const filas = await this.db.contador.findMany({ where: { clave: { in: Object.keys(CONTADORES) } } });
    const actual = new Map(filas.map((f) => [f.clave, f.valor]));
    const access = await this.ultimosDeAccess();
    const modo = modoOperacion();
    return {
      modo,
      accessDisponible: access !== null,
      contadores: (Object.keys(CONTADORES) as ClaveContador[]).map((clave) => ({
        clave,
        descripcion: CONTADORES[clave],
        actual: actual.get(clave) ?? null,
        ultimoAccess: access?.[clave] ?? null,
        siguienteAlAlinear: access?.[clave] != null ? access[clave]! + 1 : null,
      })),
      pasos: [
        'Avisar que desde ese momento no se coordina ni se ingresan guías en el sistema viejo.',
        'Correr un sync completo de documentos (el último) y revisar la validación.',
        'Poner OPERACION_MODO=activo en el .env del back y reiniciarlo (el sync se apaga solo).',
        'Alinear los contadores (este paso): POST /operacion/corte-definitivo/alinear-contadores.',
        'Las fincas cargan por el portal nuevo; desactivar la web vieja.',
        'Guardar una copia final del .mdb como archivo histórico antes de apagar la PC vieja.',
      ],
    };
  }

  /** Solo en modo activo: cada contador queda en el último número de Access (el siguiente es +1). */
  async alinearContadores(usuario?: string): Promise<EstadoCorte> {
    if (modoOperacion() !== 'activo') {
      throw new ConflictException(
        'Solo al corte definitivo (OPERACION_MODO=activo): en modo sombra el sistema viejo sigue numerando y los números chocarían.',
      );
    }
    const access = await this.ultimosDeAccess();
    if (!access) throw new ConflictException('No se pudo leer el sistema viejo (bridge): sin sus últimos números no se alinea.');
    await this.db.$transaction(async (tx) => {
      for (const clave of Object.keys(CONTADORES) as ClaveContador[]) {
        const valor = access[clave];
        if (valor == null) continue;
        await tx.contador.upsert({ where: { clave }, create: { clave, valor }, update: { valor } });
      }
    });
    this.logger.warn(`[corte] contadores alineados con Access por ${usuario ?? '?'}: ${JSON.stringify(access)}`);
    return this.estado();
  }

  private async ultimosDeAccess(): Promise<Record<ClaveContador, number | null> | null> {
    try {
      const [coo, cgu, bodega, ngh] = await Promise.all([
        this.legacy.queryBridge<{ n: number | null }>("SELECT MAX(docNumero) AS n FROM PIN_MCoordina WHERE docTipo = 'COO'"),
        this.legacy.queryBridge<{ n: number | null }>("SELECT MAX(docNumero) AS n FROM PIN_MCoordina WHERE docTipo = 'CGU'"),
        this.legacy.queryBridge<{ n: number | null }>('SELECT MAX(bodNGH) AS n FROM eBodega'),
        // El contador de bodega y el mayor número usado en el detalle de los últimos años (el máximo
        // histórico, 41.504.443, es de una numeración vieja que ya no se usa).
        this.legacy.queryBridge<{ n: number | null }>(
          "SELECT MAX(Val(detGuiaHija)) AS n FROM PIN_DCoordina WHERE docTipo = 'COO' AND docNumero > 13000 AND Val(detGuiaHija) < 40000000",
        ),
      ]);
      const num = (f: Array<{ n: number | null }>) => (f[0]?.n != null ? Number(f[0].n) : null);
      const nghs = [num(bodega), num(ngh)].filter((x): x is number => x !== null);
      return { coordinacion: num(coo), CGU: num(cgu), guiaHija: nghs.length ? Math.max(...nghs) : null };
    } catch (e) {
      this.logger.warn(`[corte] no se pudo leer Access: ${(e as Error).message}`);
      return null;
    }
  }
}
