import {
  algunaNegativa,
  CajasPorTipo,
  cajasVacias,
  describirCajas,
  restarCajas,
  separarCajas,
  totalCajas,
} from './cajas-ebf';

/**
 * Conciliación de una coordinación con EBF (ADR 0004): lo que debe haber en
 * EBF sale de la coordinación; lo pendiente es la diferencia con lo último que
 * se leyó del portal, una sola por guía hija. Sin efectos: el servicio lee,
 * llama a esto y guarda.
 *
 * Reglas del portal que condicionan el plan:
 * - Una fila de EBF es finca (exportador) × marcación × producto × DAE.
 * - Solo se edita o borra una fila el mismo día en que se coordinó; después
 *   solo se puede agregar otra (EBF las suma bajo la misma HAWB).
 * - La DAE, la finca y la marca de una fila no se cambian: se borra y se crea.
 */

/** Lo que la coordinación dice que debe haber en EBF para una guía hija. */
export interface LineaDeseada {
  /** "idConsignatario|idFinca|idProducto|dae" */
  clave: string;
  idFinca: number;
  idProducto: number | null;
  idConsignatario: number;
  numeroGuiaHija: string | null;
  /** Nombres para mostrar (los nuestros) */
  finca: string;
  producto: string;
  dae: string;
  fulls: number;
  cajas: number;
  /** null si fulls y cajas no se pudieron separar por tamaño */
  cajasPorTipo: CajasPorTipo | null;
  /** Cómo se llama en EBF (por las equivalencias); null = falta enlazar */
  ebfExportador: string | null;
  ebfMarcacion: string | null;
  ebfProducto: string | null;
}

/** Una fila del despacho / histórico de EBF. */
export interface FilaEbf {
  detalleId: number | null;
  hawb: string | null;
  exportador: string;
  marcacion: string;
  producto: string;
  dae: string | null;
  fulls: number;
  cajas: number;
  fullsBodega: number;
  cajasBodega: number;
  /** Día (Ecuador, YYYY-MM-DD) en que se coordinó la fila en EBF */
  diaCoordinacion: string | null;
  creadaEn: Date | null;
  creadaPor: string | null;
}

export type EstadoLineaEbf =
  | 'EN_EBF'
  | 'POR_ENVIAR'
  | 'CAMBIO_POR_ENVIAR'
  | 'PEDIR_A_EBF'
  | 'FALTA_ENLACE'
  | 'SOLO_EN_EBF'
  | 'ERROR'
  | 'OMITIDA';

export type AccionEbf = 'CREAR' | 'AGREGAR' | 'MODIFICAR' | 'BORRAR' | 'REEMPLAZAR';

/** Una operación del portal. */
export interface PasoEbf {
  tipo: 'CREAR' | 'MODIFICAR' | 'BORRAR';
  /** MODIFICAR / BORRAR. null si se leyó fuera de horario (EBF no muestra los ids): se relee antes de enviar. */
  detalleId?: number | null;
  /** CREAR / MODIFICAR: cajas que debe quedar teniendo esa fila */
  cajas?: CajasPorTipo;
  /** CREAR */
  dae?: string;
}

export interface PlanLinea {
  clave: string;
  deseada: LineaDeseada | null;
  filas: FilaEbf[];
  estado: EstadoLineaEbf;
  accion: AccionEbf | null;
  pasos: PasoEbf[];
  /** Explicación en palabras de la oficina */
  motivo: string;
}

export interface ContextoConciliacion {
  /**
   * Día (Ecuador, YYYY-MM-DD) en que se enviaría: hoy si EBF está abierto, si
   * no el de la próxima apertura. Así lo pendiente se muestra como quedará
   * (lo coordinado hoy, mañana ya no se edita).
   */
  hoy: string;
  /** El vuelo ya salió (EBF dice DEPARTED / DELIVERED, o la fecha pasó): EBF no acepta cambios. */
  vueloCerrado: boolean;
}

/** Mayúsculas, sin espacios repetidos: así se comparan los nombres de EBF. */
export const normEbf = (s: string | null | undefined): string =>
  (s ?? '').normalize('NFC').toUpperCase().replace(/\s+/g, ' ').trim();

/** Guía sin espacios ni guiones: "369-1176 3570" = "369-11763570" = "36911763570". */
export const normGuia = (s: string | null | undefined): string => (s ?? '').replace(/[\s-]/g, '').toUpperCase();

const identidad = (exportador: string, marcacion: string, producto: string) =>
  [normEbf(exportador), normEbf(marcacion), normEbf(producto)].join('|');

const huecoDae = (dae: string | null | undefined) => (dae ?? '').trim();

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function sumarFilas(filas: FilaEbf[]): { fulls: number; cajas: number } {
  return {
    fulls: r3(filas.reduce((s, f) => s + f.fulls, 0)),
    cajas: filas.reduce((s, f) => s + f.cajas, 0),
  };
}

const cajasTxt = (fulls: number, cajas: number) => `${cajas} caja${cajas === 1 ? '' : 's'} (${fulls} fulls)`;

/** Huella de lo deseado: si cambia, un "no enviar" deja de valer. */
export function huellaDeseada(d: LineaDeseada | null): string {
  if (!d) return '-';
  const c = d.cajasPorTipo ?? cajasVacias();
  return `${d.dae}|${c.FB}-${c.HB}-${c.QB}-${c.EB}|${d.cajas}`;
}

/**
 * Plan para una línea que tiene filas en EBF con la misma finca, marca,
 * producto y DAE. `deseada.cajas = 0` es una línea que se quitó de la
 * coordinación.
 */
function planConFilas(d: LineaDeseada, filas: FilaEbf[], ctx: ContextoConciliacion): PlanLinea {
  const visto = sumarFilas(filas);
  const base = { clave: d.clave, deseada: d, filas };
  if (r3(d.fulls) === visto.fulls && d.cajas === visto.cajas) {
    return { ...base, estado: 'EN_EBF', accion: null, pasos: [], motivo: 'Coincide con EBF.' };
  }
  // La bodega de EBF ya recibió la carga: lo que vale es lo recibido (lo coordinado allá era una estimación)
  const bodega = {
    fulls: r3(filas.reduce((s, f) => s + f.fullsBodega, 0)),
    cajas: filas.reduce((s, f) => s + f.cajasBodega, 0),
  };
  if (bodega.cajas > 0 && r3(d.fulls) === bodega.fulls && d.cajas === bodega.cajas) {
    return {
      ...base,
      estado: 'EN_EBF',
      accion: null,
      pasos: [],
      motivo: `Coincide con lo que recibió la bodega de EBF (allá se coordinó ${cajasTxt(visto.fulls, visto.cajas)}).`,
    };
  }
  const diferencia = `En EBF hay ${cajasTxt(visto.fulls, visto.cajas)}${
    bodega.cajas > 0 ? ` (bodega recibió ${cajasTxt(bodega.fulls, bodega.cajas)})` : ''
  }; la coordinación tiene ${cajasTxt(d.fulls, d.cajas)}.`;
  if (ctx.vueloCerrado) {
    return { ...base, estado: 'PEDIR_A_EBF', accion: null, pasos: [], motivo: `${diferencia} El vuelo ya salió: EBF no acepta cambios.` };
  }
  if (!d.cajasPorTipo) {
    return {
      ...base,
      estado: 'ERROR',
      accion: null,
      pasos: [],
      motivo: `No se pudo separar ${d.fulls} fulls en ${d.cajas} cajas por tamaño (FB/HB/QB/EB): revisar la línea.`,
    };
  }
  const deHoy = filas.filter((f) => f.diaCoordinacion === ctx.hoy);
  const viejas = filas.filter((f) => !deHoy.includes(f));
  const fijo = sumarFilas(viejas);
  const fijoPorTipo = viejas.length ? separarCajas(fijo.fulls, fijo.cajas) : cajasVacias();
  const resto = fijoPorTipo ? restarCajas(d.cajasPorTipo, fijoPorTipo) : null;

  if (!resto || algunaNegativa(resto)) {
    return {
      ...base,
      estado: 'PEDIR_A_EBF',
      accion: null,
      pasos: [],
      motivo: `${diferencia} Lo coordinado en EBF otro día${
        fijoPorTipo ? ` (${describirCajas(fijoPorTipo)})` : ''
      } no se puede bajar ni cambiar de tamaño: hay que pedírselo a EBF.`,
    };
  }
  const pasos: PasoEbf[] = [];
  if (deHoy.length) {
    const [primera, ...otras] = deHoy;
    if (totalCajas(resto) === 0) pasos.push({ tipo: 'BORRAR', detalleId: primera.detalleId });
    else pasos.push({ tipo: 'MODIFICAR', detalleId: primera.detalleId, cajas: resto });
    for (const f of otras) pasos.push({ tipo: 'BORRAR', detalleId: f.detalleId });
    const borraTodo = totalCajas(resto) === 0 && viejas.length === 0;
    return {
      ...base,
      estado: 'CAMBIO_POR_ENVIAR',
      accion: borraTodo ? 'BORRAR' : 'MODIFICAR',
      pasos,
      motivo: borraTodo
        ? `${diferencia} Se borra de EBF.`
        : `${diferencia} Se corrige la fila de hoy a ${describirCajas(resto)}.`,
    };
  }
  pasos.push({ tipo: 'CREAR', cajas: resto, dae: d.dae });
  return {
    ...base,
    estado: 'CAMBIO_POR_ENVIAR',
    accion: 'AGREGAR',
    pasos,
    motivo: `${diferencia} Se agrega una fila con ${describirCajas(resto)} (EBF la suma a la misma guía hija).`,
  };
}

/**
 * Concilia las guías hijas de una coordinación con las filas que EBF tiene
 * para su vuelo. Devuelve un plan por línea deseada y uno por cada grupo de
 * filas de EBF que no corresponde a ninguna (SOLO_EN_EBF).
 */
export function conciliar(deseadas: LineaDeseada[], filas: FilaEbf[], ctx: ContextoConciliacion): PlanLinea[] {
  // Filas de EBF agrupadas por finca × marca × producto × DAE
  const grupos = new Map<string, FilaEbf[]>();
  for (const f of filas) {
    const k = `${identidad(f.exportador, f.marcacion, f.producto)}|${huecoDae(f.dae)}`;
    const g = grupos.get(k);
    if (g) g.push(f);
    else grupos.set(k, [f]);
  }
  const usados = new Set<string>();
  const planes: PlanLinea[] = [];
  const pendientes: LineaDeseada[] = [];

  // 1. Misma finca, marca, producto y DAE
  for (const d of deseadas) {
    if (!d.ebfExportador || !d.ebfMarcacion || !d.ebfProducto) {
      pendientes.push(d);
      continue;
    }
    const k = `${identidad(d.ebfExportador, d.ebfMarcacion, d.ebfProducto)}|${huecoDae(d.dae)}`;
    const g = grupos.get(k);
    if (g && !usados.has(k)) {
      usados.add(k);
      planes.push(planConFilas(d, g, ctx));
    } else {
      pendientes.push(d);
    }
  }

  // 2. Lo que no se encontró: DAE distinta, falta enlazar o no está en EBF
  for (const d of pendientes) {
    if (!d.ebfExportador || !d.ebfMarcacion || !d.ebfProducto) {
      const faltan = [!d.ebfExportador && 'la finca', !d.ebfMarcacion && 'la marca', !d.ebfProducto && 'el producto'].filter(
        Boolean,
      ) as string[];
      // Pista: una fila de EBF con la misma DAE (la DAE es de una sola finca)
      const pista = [...grupos.entries()].find(
        ([k, g]) =>
          !usados.has(k) &&
          huecoDae(g[0].dae) === huecoDae(d.dae) &&
          (!d.ebfProducto || normEbf(g[0].producto) === normEbf(d.ebfProducto)) &&
          (!d.ebfMarcacion || normEbf(g[0].marcacion) === normEbf(d.ebfMarcacion)),
      );
      if (pista) usados.add(pista[0]);
      planes.push({
        clave: d.clave,
        deseada: d,
        filas: pista ? pista[1] : [],
        estado: 'FALTA_ENLACE',
        accion: null,
        pasos: [],
        motivo: `Falta enlazar con EBF ${faltan.join(', ')}.${
          pista ? ` En EBF parece ser «${pista[1][0].exportador} · ${pista[1][0].producto}» (misma DAE).` : ''
        }`,
      });
      continue;
    }
    const ident = identidad(d.ebfExportador, d.ebfMarcacion, d.ebfProducto);
    const otraDae = [...grupos.entries()].find(([k]) => !usados.has(k) && k.startsWith(`${ident}|`));
    if (otraDae) {
      const [k, g] = otraDae;
      usados.add(k);
      const daeEbf = huecoDae(g[0].dae);
      const todasDeHoy = g.every((f) => f.diaCoordinacion === ctx.hoy);
      if (d.cajas === 0) {
        // Se quitó de la coordinación: se borra lo que haya (si se puede)
        planes.push(planConFilas({ ...d, dae: daeEbf }, g, ctx));
        continue;
      }
      if (todasDeHoy && d.cajasPorTipo && !ctx.vueloCerrado) {
        planes.push({
          clave: d.clave,
          deseada: d,
          filas: g,
          estado: 'CAMBIO_POR_ENVIAR',
          accion: 'REEMPLAZAR',
          pasos: [
            ...g.map((f) => ({ tipo: 'BORRAR' as const, detalleId: f.detalleId })),
            { tipo: 'CREAR', cajas: d.cajasPorTipo, dae: d.dae },
          ],
          motivo: `EBF tiene la DAE ${daeEbf}; la coordinación, ${d.dae}. Se borra y se vuelve a coordinar con la DAE correcta.`,
        });
      } else {
        planes.push({
          clave: d.clave,
          deseada: d,
          filas: g,
          estado: 'PEDIR_A_EBF',
          accion: null,
          pasos: [],
          motivo: `EBF tiene la DAE ${daeEbf}; la coordinación, ${d.dae}. EBF no deja cambiar la DAE de una fila coordinada otro día: confirmar cuál es la buena y, si es la de la coordinación, pedírselo a EBF.`,
        });
      }
      continue;
    }
    if (d.cajas === 0) continue; // se quitó y en EBF no hay nada: no queda pendiente
    if (!d.cajasPorTipo) {
      planes.push({
        clave: d.clave,
        deseada: d,
        filas: [],
        estado: 'ERROR',
        accion: null,
        pasos: [],
        motivo: `No se pudo separar ${d.fulls} fulls en ${d.cajas} cajas por tamaño (FB/HB/QB/EB): revisar la línea.`,
      });
      continue;
    }
    if (ctx.vueloCerrado) {
      planes.push({
        clave: d.clave,
        deseada: d,
        filas: [],
        estado: 'PEDIR_A_EBF',
        accion: null,
        pasos: [],
        motivo: `No está en EBF y el vuelo ya salió: EBF no acepta cambios (${cajasTxt(d.fulls, d.cajas)} con la DAE ${d.dae}).`,
      });
      continue;
    }
    planes.push({
      clave: d.clave,
      deseada: d,
      filas: [],
      estado: 'POR_ENVIAR',
      accion: 'CREAR',
      pasos: [{ tipo: 'CREAR', cajas: d.cajasPorTipo, dae: d.dae }],
      motivo: `No está en EBF: se coordina ${describirCajas(d.cajasPorTipo)} con la DAE ${d.dae}.`,
    });
  }

  // 3. Filas de EBF que no son de ninguna línea de la coordinación
  for (const [k, g] of grupos) {
    if (usados.has(k)) continue;
    const visto = sumarFilas(g);
    planes.push({
      clave: `ebf:${k}`,
      deseada: null,
      filas: g,
      estado: 'SOLO_EN_EBF',
      accion: null,
      pasos: [],
      motivo: `En EBF hay ${cajasTxt(visto.fulls, visto.cajas)} de ${g[0].exportador} · ${g[0].producto} que no están en la coordinación${
        g[0].creadaPor ? ` (la coordinó ${g[0].creadaPor})` : ''
      }.`,
    });
  }
  return planes;
}
