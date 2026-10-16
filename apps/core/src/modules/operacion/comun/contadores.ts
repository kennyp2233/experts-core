import type { Prisma } from '@internal/documentos-client';
import { modoOperacion } from './modo-operacion';

/**
 * Primer número de guía hija del sistema nuevo. En modo sombra se usa un
 * rango propio (90.000.000) para no chocar nunca con los números del sistema
 * viejo; al pasar a modo activo el contador se iguala al del sistema viejo
 * (`BODEGA.bodNGH`) con OPERACION_NGH_INICIO.
 */
export function inicioGuiaHija(): number {
  const n = parseInt(process.env.OPERACION_NGH_INICIO || '', 10);
  if (Number.isFinite(n) && n > 0) return n;
  return modoOperacion() === 'sombra' ? 90_000_000 : 1;
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
