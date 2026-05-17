import type { CoordinacionDetalle } from '../types/coordinacion.types';

/**
 * Placeholder: el detalle requiere ver HTML real logueado en horario
 * operativo para mapear secciones (datos generales, marcas, vuelos,
 * adjuntos). Por ahora retorna el HTML crudo en `raw.html` y el id.
 * Ver EBF_PORTAL_TOMORROW.md.
 */
export function parseCoordinacionDetalle(
  id: string,
  html: string,
): CoordinacionDetalle {
  return {
    id,
    raw: { html },
  };
}
