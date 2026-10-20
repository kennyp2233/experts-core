import type { Prisma } from '@internal/documentos-client';
import { modoOperacion } from './modo-operacion';

const entero = (v: string | undefined): number | null => {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Primer número de guía hija del sistema nuevo. En modo sombra se usa un
 * rango propio (90.000.000) para no chocar nunca con los números del sistema
 * viejo. Solo vale la primera vez (cuando no existe la fila del contador): para
 * seguir la serie del sistema viejo al pasar a modo activo se alinea el
 * contador con `PrepararCorteService` (lee `eBodega.bodNGH` de Access).
 */
export function inicioGuiaHija(): number {
  return entero(process.env.OPERACION_NGH_INICIO) ?? 90_000_000;
}

/**
 * Primer N° de coordinación del sistema nuevo: en modo sombra 900.000 (como
 * los ingresos CGU-0900000), lejos del 13.9xx de Access. Igual que el de guías
 * hijas, al corte se alinea con el último N° de Access.
 */
export function inicioCoordinacion(): number {
  return entero(process.env.OPERACION_COO_INICIO) ?? (modoOperacion() === 'sombra' ? 900_000 : 1);
}

/**
 * Siguiente valor de un contador, atómico (un solo statement): si no existe lo
 * crea con `inicial`; si existe lo incrementa. Llamarlo dentro de la
 * transacción que usa el número.
 */
export async function siguiente(tx: Prisma.TransactionClient, clave: string, inicial: number): Promise<number> {
  const filas = await tx.$queryRaw<Array<{ valor: number }>>`
    INSERT INTO "Contador" ("clave", "valor", "updatedAt") VALUES (${clave}, ${inicial}, now())
    ON CONFLICT ("clave") DO UPDATE SET "valor" = "Contador"."valor" + 1, "updatedAt" = now()
    RETURNING "valor"`;
  return Number(filas[0].valor);
}
