import { normalize } from '../../../../common/utils/normalizer.util';

/**
 * Sugerencia de código Agrocalidad para un proCodigo de Access que todavía no
 * tiene mapeo recordado.
 *
 * Los códigos de Access son nombres comerciales en inglés o en plural ("ROSAS",
 * "STOCK", "MINI CARNATIONS") y el catálogo Agrocalidad usa nombres comunes en
 * español y singular ("ROSA", "ALHELI", "MINICLAVEL"). Se generan variantes
 * normalizadas del código y se buscan por igualdad exacta contra
 * `catalogo_productos.nombre_comun_normalizado` — nunca por "contiene", para no
 * sugerir algo equivocado (p. ej. "ROSA HYBRIDA" para "ROSAS").
 */

/**
 * Nombre comercial (normalizado) → nombre común del catálogo. Solo incluye
 * equivalencias verificadas contra el catálogo cargado; lo que no esté aquí lo
 * aprende la memoria de mapeos la primera vez que alguien lo elige a mano.
 */
export const SINONIMOS_PRODUCTO: Record<string, string> = {
    ROSE: 'ROSA',
    'SPRAY ROSE': 'MINI ROSA',
    'SPRY ROSE': 'MINI ROSA',
    CARNATION: 'CLAVEL',
    'MINI CARNATION': 'MINICLAVEL',
    STOCK: 'ALHELI',
    ALELI: 'ALHELI',
    CHRYSANTEMUM: 'CRISANTEMO',
    CHRYSANTHEMUM: 'CRISANTEMO',
    LILIUM: 'LIRIO LILIUM',
    LIRIO: 'LIRIO LILIUM',
    AMARANTHUS: 'AMARANTO',
    HYDRANGEA: 'HORTENSIA',
    RANUNCULA: 'RANUNCULO',
    RANUNCULUS: 'RANUNCULO',
    SUNFLOWER: 'GIRASOL',
    'FLOWERING KALE': 'COL ORNAMENTAL',
    MASSANGEANA: 'DRACAENA MASSANGEANA',
    'CROTO LEAVE': 'CROTO',
};

/** Singulares posibles de una palabra ("ROSAS" → "ROSA", "LIRIOS" → "LIRIO"). */
function singulares(palabra: string): string[] {
    const out = [palabra];
    if (palabra.length > 3 && palabra.endsWith('ES')) out.push(palabra.slice(0, -2));
    if (palabra.length > 3 && palabra.endsWith('S')) out.push(palabra.slice(0, -1));
    return out;
}

/**
 * Variantes normalizadas a buscar, en orden de preferencia: el código tal cual,
 * sus singulares (de la última palabra) y luego los sinónimos de cada uno.
 */
export function variantesProducto(proCodigo: string): string[] {
    const base = normalize(proCodigo);
    if (!base) return [];
    const palabras = base.split(' ');
    const ultima = palabras.pop() as string;
    const formas = singulares(ultima).map((u) => [...palabras, u].join(' '));
    const conSinonimos = formas.flatMap((f) => (SINONIMOS_PRODUCTO[f] ? [f, SINONIMOS_PRODUCTO[f]] : [f]));
    return [...new Set(conSinonimos)];
}
