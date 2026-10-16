import { ForbiddenException } from '@nestjs/common';

/**
 * Mientras Access sea el sistema que manda (`OPERACION_MODO=sombra`, el
 * default), el sistema nuevo solo puede modificar lo que creó él mismo: lo que
 * vino del sistema viejo (tiene `codigoAccess`) lo sobrescribe el sync. Al
 * corte se pasa a `OPERACION_MODO=activo`.
 */
export type ModoOperacion = 'sombra' | 'activo';

export const modoOperacion = (): ModoOperacion =>
  (process.env.OPERACION_MODO || 'sombra').toLowerCase() === 'activo' ? 'activo' : 'sombra';

export function asegurarEditable(registro: { codigoAccess: number | null } | null | undefined, que: string): void {
  if (registro && registro.codigoAccess !== null && modoOperacion() === 'sombra') {
    throw new ForbiddenException(
      `${que} viene del sistema viejo: mientras ese sistema mande se modifica allá (el cambio llega solo con la sincronización).`,
    );
  }
}
