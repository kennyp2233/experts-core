import { num, txt } from '../../engine/normalize';
import { AccessRow, EntidadSync } from '../../engine/sync.types';

interface ParametroRow {
  clave: string;
  descripcion: string | null;
  valorNumero: number | null;
  valorTexto: string | null;
  fuente: string;
}

/** Aplana una tabla de una sola fila (configuración) a clave/valor. */
function aplanar(rows: AccessRow[], prefijo: string, fuente: string): ParametroRow[] {
  const out: ParametroRow[] = [];
  rows.forEach((row, i) => {
    const base = rows.length === 1 ? prefijo : `${prefijo}[${i}]`;
    for (const [col, v] of Object.entries(row)) {
      if (col === 'Sync') continue;
      const esNumero = typeof v === 'number' || typeof v === 'boolean';
      out.push({
        clave: `${base}.${col}`,
        descripcion: null,
        valorNumero: esNumero ? num(Number(v)) : null,
        valorTexto: esNumero ? null : txt(v),
        fuente,
      });
    }
  });
  return out;
}

/**
 * Parámetros del negocio → Parametro (clave/valor):
 *  - _PARAMETROS   → "PARAMETROS.<ID>"  (tarifas FITO, guía certificada, MiPro…)
 *  - _PIN_MParams  → "MPARAMS.<col>"    (emisor, piezas por full, kg por pieza…)
 *  - eEmpresa      → "EMPRESA.<col>"
 *  - eBodega       → "BODEGA.<col>"     (incluye bodNGH, el contador de guías hijas)
 */
export const parametro: EntidadSync<ParametroRow, ParametroRow> = {
  entidad: 'parametro',
  leer: async (ctx) => {
    const params = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT ID, Descrip, Val, Txt FROM _PARAMETROS',
    );
    const mparams = await ctx.legacy.queryBridge<AccessRow>('SELECT * FROM _PIN_MParams');
    const empresa = await ctx.legacy.queryBridge<AccessRow>('SELECT * FROM eEmpresa');
    const bodega = await ctx.legacy.queryBridge<AccessRow>('SELECT * FROM eBodega');
    return [
      ...params
        .filter((p) => txt(p.ID))
        .map((p) => ({
          clave: `PARAMETROS.${txt(p.ID)}`,
          descripcion: txt(p.Descrip),
          valorNumero: num(p.Val),
          valorTexto: txt(p.Txt),
          fuente: '_PARAMETROS',
        })),
      ...aplanar(mparams, 'MPARAMS', '_PIN_MParams'),
      ...aplanar(empresa, 'EMPRESA', 'eEmpresa'),
      ...aplanar(bodega, 'BODEGA', 'eBodega'),
    ];
  },
  clave: (r) => r.clave,
  mapear: (r) => r,
  guardar: async (db, d) => {
    await db.parametro.upsert({ where: { clave: d.clave }, create: d, update: d });
    return null;
  },
};
