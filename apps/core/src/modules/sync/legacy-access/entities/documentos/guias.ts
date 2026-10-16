import type { Prisma } from '@internal/documentos-client';
import { idDe } from '../../engine/sync-engine';
import { fechaDia, fechaHora, flag, int, numSin0, txt } from '../../engine/normalize';
import { AccessRow, EntidadSync } from '../../engine/sync.types';

type Tx = Prisma.TransactionClient;

/** "129-4595 9174" → "129-45959174" (clave de la guía madre). */
export function normalizarAwb(v: unknown): string | null {
  const s = txt(v)?.replace(/\s+/g, '');
  return s ? s : null;
}

const ESTADO_LOTE = ['ANULADO', 'INGRESADO', 'GUIAS_COORDINADAS', 'CANCELADO'] as const;
const ESTADO_GUIA: Record<number, 'INGRESADA' | 'COORDINADA' | 'PRESTADA'> = {
  1: 'INGRESADA',
  2: 'COORDINADA',
  3: 'PRESTADA',
};

interface LoteRow extends AccessRow {
  aerMin: unknown;
  aerMax: unknown;
  virMin: unknown;
  virMax: unknown;
  /** shiCodigo de la agencia IATA cuyo código coincide con la referencia (docRefer). */
  shiCodigo: unknown;
}

const digitos = (v: unknown) => txt(v)?.replace(/\D/g, '') || null;

/**
 * PIN_MCoordina con docTipo 'CGU' (Ingreso de guías: documento con el que
 * nace cada guía AWB) → DocumentoBase. Aerolínea (`docExtra`) y tipo de stock
 * (`docCert`: 0 normal, 1 virtual) salen de la cabecera; si falta, de sus
 * guías cuando todas coinciden. La referencia es el código IATA de la agencia
 * con que se reservó la guía (se compara solo por dígitos: EBF aparece como
 * 79-1-0037-0016 y como 79100370016).
 */
export const loteGuias: EntidadSync<LoteRow, any, Tx> = {
  entidad: 'loteGuias',
  leer: async (ctx) => {
    const lotes = await ctx.legacy.queryBridge<AccessRow>(
      "SELECT m.docNumero, m.docFecha, m.docRefer, m.docEstado, m.docNota, m.docExtra, m.docCert, u.docFecCre, u.docUsuCre, u.docFecAct, u.docUsuAct FROM PIN_MCoordina AS m LEFT JOIN dDocUsuario AS u ON (u.bodCodigo = m.bodCodigo AND u.docTipo = m.docTipo AND u.docNumero = m.docNumero) WHERE m.docTipo = 'CGU'",
    );
    const agg = await ctx.legacy.queryBridge<AccessRow>(
      "SELECT docNumero, MIN(aerCodigo) AS aerMin, MAX(aerCodigo) AS aerMax, MIN(guiVirtual) AS virMin, MAX(guiVirtual) AS virMax FROM PIN_DCoorGuias WHERE docTipo = 'CGU' GROUP BY docNumero",
    );
    const agencias = await ctx.legacy.queryBridge<AccessRow>('SELECT shiCodigo, iatCode FROM PIN_auxShippers');
    const porIata = new Map<string, unknown>();
    for (const a of agencias) {
      const d = digitos(a.iatCode);
      if (d && !porIata.has(d)) porIata.set(d, a.shiCodigo);
    }
    const porDoc = new Map(agg.map((a) => [txt(a.docNumero), a]));
    return lotes.map((l) => {
      const a = porDoc.get(txt(l.docNumero));
      const ref = digitos(l.docRefer);
      return {
        ...l,
        aerMin: a?.aerMin ?? null,
        aerMax: a?.aerMax ?? null,
        virMin: a?.virMin ?? null,
        virMax: a?.virMax ?? null,
        shiCodigo: ref ? (porIata.get(ref) ?? null) : null,
      };
    });
  },
  clave: (r) => txt(r.docNumero),
  mapear: (r, ctx) => {
    const unaAerolinea = r.aerMin !== null && int(r.aerMin) === int(r.aerMax);
    const unTipo = r.virMin !== null && int(r.virMin) === int(r.virMax);
    const aerCabecera = int(r.docExtra);
    const tipoCabecera = int(r.docCert);
    return {
      codigoAccess: int(r.docNumero),
      numero: int(r.docNumero),
      fecha: fechaDia(r.docFecha),
      idAerolinea: aerCabecera
        ? idDe(ctx, 'aerolinea', aerCabecera)
        : unaAerolinea
          ? idDe(ctx, 'aerolinea', r.aerMin)
          : null,
      tipoStock:
        tipoCabecera !== null
          ? tipoCabecera === 0
            ? 'NORMAL'
            : 'VIRTUAL'
          : unTipo
            ? flag(r.virMin)
              ? 'VIRTUAL'
              : 'NORMAL'
            : null,
      idAgenciaIata: r.shiCodigo !== null ? idDe(ctx, 'agenciaIata', r.shiCodigo) : null,
      estado: ESTADO_LOTE[int(r.docEstado) ?? -1] ?? null,
      referencia: txt(r.docRefer),
      nota: txt(r.docNota),
      creadoPorLegacy: txt(r.docUsuCre),
      creadoEnLegacy: fechaHora(r.docFecCre),
      actualizadoPorLegacy: txt(r.docUsuAct),
      actualizadoEnLegacy: fechaHora(r.docFecAct),
    };
  },
  guardar: async (db, d) =>
    (
      await db.documentoBase.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.documentoBase.updateMany({ where: { id }, data: { estado: 'ANULADO' } });
  },
};

/**
 * PIN_DCoorGuias → GuiaMadre (una guía AWB del stock). Clave: el número AWB
 * sin espacios, que es único en Access. Se hace upsert (nunca se borra) porque
 * las coordinaciones y guías hijas apuntan a su id. Cuando el sistema viejo
 * borra la fila (anula o modifica su ingreso: ~85 por año) la guía queda
 * ANULADA. Si la guía ya está en un ingreso del sistema nuevo no se cambia de
 * ingreso: queda como error del sync para revisar (se cargó en los dos).
 */
export const guiaMadre: EntidadSync<AccessRow, any, Tx> = {
  entidad: 'guiaMadre',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      "SELECT docNumero, guiNumero, aerCodigo, guiEstado, guiNumCoor, guiNota, guiFecha, guiDev, guiFecDev, guiVirtual FROM PIN_DCoorGuias WHERE docTipo = 'CGU'",
    ),
  clave: (r) => normalizarAwb(r.guiNumero),
  mapear: (r, ctx) => {
    const numero = normalizarAwb(r.guiNumero)!;
    // Prefijo de 3 caracteres: numérico (IATA) o alfanumérico (ej. "F37" de FEMKE).
    const m = numero.match(/^([0-9A-Z]{3})-?(\d{1,9})$/i);
    if (!m) return { omitir: `número AWB no reconocible: ${txt(r.guiNumero)}` };
    const idDocumentoBase = idDe(ctx, 'loteGuias', r.docNumero);
    if (idDocumentoBase === null) return { omitir: `el lote ${txt(r.docNumero)} no está sincronizado` };
    const estado = int(r.guiEstado);
    return {
      numero,
      prefijo: /^\d+$/.test(m[1]) ? Number(m[1]) : null,
      secuencial: Number(m[2]),
      idDocumentoBase,
      idAerolinea: idDe(ctx, 'aerolinea', r.aerCodigo),
      estado: estado === null ? null : (ESTADO_GUIA[estado] ?? null),
      virtual: flag(r.guiVirtual),
      prestada: estado === 3,
      observaciones: txt(r.guiNota),
      fechaPrestamo: fechaDia(r.guiFecha),
      devolucion: txt(r.guiDev) === '1',
      fechaDevolucion: fechaDia(r.guiFecDev),
      coordinacionAccess: int(numSin0(r.guiNumCoor)),
    };
  },
  guardar: async (db, d) => {
    const actual = await db.guiaMadre.findUnique({
      where: { numero: d.numero },
      select: { documentoBase: { select: { codigoAccess: true, numero: true } } },
    });
    if (actual && actual.documentoBase.codigoAccess === null) {
      throw new Error(
        `La guía ${d.numero} ya está en el ingreso N° ${actual.documentoBase.numero ?? '?'} del sistema nuevo: se cargó en los dos sistemas.`,
      );
    }
    return (
      await db.guiaMadre.upsert({
        where: { numero: d.numero },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id;
  },
  desactivar: async (db, id) => {
    await db.guiaMadre.updateMany({ where: { id, estado: { not: 'COORDINADA' } }, data: { estado: 'ANULADA' } });
  },
};
