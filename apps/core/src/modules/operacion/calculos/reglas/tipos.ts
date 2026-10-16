import type { Prisma } from '@internal/documentos-client';

/** Coordinación con todo lo que necesitan las reglas (una consulta por lote). */
export const includeCoordinacionCompleta = {
  liquidaciones: true,
  guiaHijas: { include: { detalles: true } },
} satisfies Prisma.DocumentoCoordinacionInclude;

export type CoordinacionCompleta = Prisma.DocumentoCoordinacionGetPayload<{
  include: typeof includeCoordinacionCompleta;
}>;

/** Resultado de aplicar una regla a una coordinación. */
export interface ResultadoRegla {
  ok: boolean;
  /** Lo que guardó el sistema viejo. */
  esperado: unknown;
  /** Lo que calcula el sistema nuevo. */
  calculado: unknown;
  nota?: string;
}

/**
 * Regla de negocio del sistema nuevo validada contra lo que guardó Access.
 * `evaluar` devuelve null cuando la regla no aplica a esa coordinación (ej.
 * falta el dato de entrada).
 */
export interface ReglaNegocio {
  id: string;
  nombre: string;
  descripcion: string;
  evaluar(c: CoordinacionCompleta): ResultadoRegla | null;
}

/** Igualdad numérica con tolerancia (default 1 centavo). */
export const igual = (a: number | null | undefined, b: number | null | undefined, tol = 0.01) =>
  (a ?? 0) === (b ?? 0) || Math.abs((a ?? 0) - (b ?? 0)) <= tol;

export const redondear = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
