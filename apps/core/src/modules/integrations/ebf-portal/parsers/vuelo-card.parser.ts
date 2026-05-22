import type { VueloCard } from '../types/coordinacion-create.types';

/**
 * Parser del partial `/exportador/detalle/vuelo/` (card derecho de la
 * página coordinar). Estructura observada: cada campo en un `<span
 * id="...">` con texto plano. El portal escribe "---" cuando no hay dato.
 */
const SPAN_BY_ID_RX = (id: string) =>
  new RegExp(`<span\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i');

function pick(html: string, id: string): string | null {
  const m = SPAN_BY_ID_RX(id).exec(html);
  if (!m) return null;
  const txt = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!txt || txt === '---') return null;
  return txt;
}

export function parseVueloCard(html: string): VueloCard {
  return {
    exportador: pick(html, 'exportador'),
    cliente: pick(html, 'cliente'),
    id: pick(html, 'id'),
    fechaVuelo: pick(html, 'fecha_vuelo'),
    ruta: pick(html, 'ruta'),
    aerolinea: pick(html, 'aerolinea'),
  };
}
