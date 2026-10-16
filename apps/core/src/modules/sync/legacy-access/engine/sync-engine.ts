import { createHash } from 'crypto';
import { jsonEstable } from './normalize';
import {
  ClienteSync,
  EntidadSync,
  esOmitido,
  ResumenEntidad,
  SyncContext,
} from './sync.types';

const LOTE_VISTO_EN = 500;
/** Una coordinación grande reemplaza decenas de filas hijas: margen amplio. */
const TX_OPCIONES = { timeout: 60_000, maxWait: 10_000 };

function mensaje(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  // Los errores de Prisma traen varias líneas; la última es la útil.
  return m.split('\n').filter((l) => l.trim() !== '').pop()?.trim() ?? m;
}

/** Mapa claveAccess → id PG de una entidad (lo crea si no existe). */
export function idsDe(ctx: SyncContext, entidad: string): Map<string, number> {
  let m = ctx.ids.get(entidad);
  if (!m) {
    m = new Map();
    ctx.ids.set(entidad, m);
  }
  return m;
}

/** id PG de un registro ya sincronizado, o null. */
export function idDe(
  ctx: SyncContext,
  entidad: string,
  clave: unknown,
): number | null {
  if (clave === null || clave === undefined) return null;
  const k = String(clave).trim();
  if (k === '') return null;
  return ctx.ids.get(entidad)?.get(k) ?? null;
}

async function* comoLotes<T>(
  fuente: Promise<T[]> | AsyncIterable<T[]>,
): AsyncIterable<T[]> {
  if (Symbol.asyncIterator in (fuente as object)) {
    yield* fuente as AsyncIterable<T[]>;
  } else {
    yield await (fuente as Promise<T[]>);
  }
}

/**
 * Sincroniza una entidad:
 *  - lee las filas de origen (todas juntas o por lotes);
 *  - por cada una calcula el hash de lo que se escribiría y, si coincide con
 *    el de la bitácora, la salta (no toca PG) — salvo en modo `forzar`;
 *  - si cambió o es nueva, la guarda en una transacción junto con su fila de
 *    bitácora;
 *  - si la lectura fue completa, las claves que estaban en la bitácora y ya
 *    no vienen de Access se desactivan (nunca se borran) y quedan marcadas
 *    con `ausenteDesde`.
 * Los errores de una fila no detienen el resto.
 */
export async function sincronizarEntidad(
  cliente: ClienteSync,
  def: EntidadSync<any, any, any>,
  ctx: SyncContext,
  ahora: Date,
): Promise<ResumenEntidad> {
  const t0 = Date.now();
  const r: ResumenEntidad = {
    entidad: def.entidad,
    leidos: 0,
    creados: 0,
    actualizados: 0,
    sinCambios: 0,
    desactivados: 0,
    omitidos: [],
    errores: [],
    ms: 0,
  };

  const registros = await cliente.syncLegacyRegistro.findMany({
    where: { entidad: def.entidad },
  });
  const porClave = new Map(registros.map((x) => [x.claveAccess, x]));
  const ids = idsDe(ctx, def.entidad);
  const vistos = new Set<string>();
  const sinCambios: string[] = [];
  let idSimulado = -1;

  try {
    for await (const rows of comoLotes(def.leer(ctx))) {
      r.leidos += rows.length;
      for (const row of rows) {
        const clave = def.clave(row);
        if (clave === null) {
          r.omitidos.push({ clave: '(vacía)', motivo: 'fila sin clave en Access' });
          continue;
        }
        if (vistos.has(clave)) {
          r.omitidos.push({ clave, motivo: 'clave duplicada en Access' });
          continue;
        }
        vistos.add(clave);

        try {
          const data = def.mapear(row, ctx);
          if (esOmitido(data)) {
            r.omitidos.push({ clave, motivo: data.omitir });
            continue;
          }
          const hash = createHash('sha1').update(jsonEstable(data)).digest('hex');
          const reg = porClave.get(clave);
          const idReg = reg?.idPg != null ? Number(reg.idPg) : null;

          if (!ctx.forzar && reg && reg.hash === hash && !reg.ausenteDesde) {
            r.sinCambios++;
            if (idReg !== null) ids.set(clave, idReg);
            sinCambios.push(clave);
            continue;
          }

          if (ctx.dryRun) {
            if (reg) r.actualizados++;
            else r.creados++;
            // Id simulado para que las entidades dependientes resuelvan sus FKs.
            ids.set(clave, idReg ?? idSimulado--);
            continue;
          }

          const idPg = await cliente.$transaction(async (tx) => {
            const id = await def.guardar(tx, data);
            const idTexto = id === null ? null : String(id);
            await tx.syncLegacyRegistro.upsert({
              where: {
                entidad_claveAccess: { entidad: def.entidad, claveAccess: clave },
              },
              create: {
                entidad: def.entidad,
                claveAccess: clave,
                idPg: idTexto,
                hash,
                vistoEn: ahora,
              },
              update: { idPg: idTexto, hash, vistoEn: ahora, ausenteDesde: null },
            });
            return id;
          }, TX_OPCIONES);
          if (reg) r.actualizados++;
          else r.creados++;
          if (idPg !== null) ids.set(clave, idPg);
        } catch (e) {
          r.errores.push({ clave, error: mensaje(e) });
        }
      }
    }
  } catch (e) {
    // Falló la lectura (el bridge, una columna que no existe…): no se marca
    // nada como ausente porque no sabemos qué faltó leer.
    r.errorFatal = `No se pudo leer el origen: ${mensaje(e)}`;
    r.ms = Date.now() - t0;
    return r;
  }

  // Registros que ya no vienen de Access → desactivar (una sola vez). Solo si
  // la lectura fue completa.
  const lecturaParcial = def.incremental === true && ctx.modo === 'incremental';
  if (!lecturaParcial) {
    for (const reg of registros) {
      if (vistos.has(reg.claveAccess) || reg.ausenteDesde) continue;
      if (ctx.dryRun) {
        r.desactivados++;
        continue;
      }
      try {
        await cliente.$transaction(async (tx) => {
          if (def.desactivar && reg.idPg != null) {
            await def.desactivar(tx, Number(reg.idPg));
          }
          await tx.syncLegacyRegistro.update({
            where: { id: reg.id },
            data: { ausenteDesde: ahora },
          });
        }, TX_OPCIONES);
        r.desactivados++;
      } catch (e) {
        r.errores.push({ clave: reg.claveAccess, error: `desactivar: ${mensaje(e)}` });
      }
    }
  }

  if (!ctx.dryRun) {
    for (let i = 0; i < sinCambios.length; i += LOTE_VISTO_EN) {
      await cliente.syncLegacyRegistro.updateMany({
        where: {
          entidad: def.entidad,
          claveAccess: { in: sinCambios.slice(i, i + LOTE_VISTO_EN) },
        },
        data: { vistoEn: ahora },
      });
    }
  }

  r.ms = Date.now() - t0;
  return r;
}
