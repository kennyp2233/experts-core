import type { Prisma } from '@internal/documentos-client';
import { idDe } from '../../engine/sync-engine';
import {
  agrupar,
  fechaDia,
  fechaHora,
  flag,
  int,
  literalFechaAccess,
  num,
  numSin0,
  textoFechaAccess,
  trozos,
  txt,
} from '../../engine/normalize';
import { AccessRow, EntidadSync, SyncContext } from '../../engine/sync.types';
import { normalizarAwb } from './guias';

type Tx = Prisma.TransactionClient;

/** Coordinaciones por consulta al bridge (cada trozo son ~8 SELECT). */
const POR_TROZO = 300;
/** Modo incremental: además de lo modificado, relee las coordinaciones de los últimos N días. */
const VENTANA_DIAS = Math.max(1, parseInt(process.env.LEGACY_SYNC_DOCS_VENTANA_DIAS || '15', 10) || 15);
/** Margen hacia atrás sobre la última corrida, por relojes desfasados. */
const MARGEN_MS = 60 * 60 * 1000;

/** Una coordinación (docTipo 'COO') con todas sus tablas. */
export interface CoordinacionRow {
  docNumero: number;
  cab: AccessRow;
  extra: AccessRow | null;
  ruta: AccessRow | null;
  cae: AccessRow | null;
  marcas: AccessRow[];
  medidas: AccessRow[];
  lineas: AccessRow[];
}

const IN = (nums: number[]) => nums.join(',');
const primeroPorDoc = (rows: AccessRow[]) => {
  const m = new Map<number, AccessRow>();
  for (const r of rows) {
    const k = int(r.docNumero);
    if (k !== null && !m.has(k)) m.set(k, r);
  }
  return m;
};
const porDoc = (rows: AccessRow[]) => {
  const m = agrupar(rows, (r) => txt(r.docNumero));
  for (const list of m.values()) list.sort((a, b) => (int(a.detNumero) ?? 0) - (int(b.detNumero) ?? 0));
  return m;
};

/** docNumero de las coordinaciones a leer: todas, o las recientes/modificadas. */
async function numerosALeer(ctx: SyncContext): Promise<number[]> {
  let sql: string;
  if (ctx.modo === 'completo' || !ctx.desde) {
    sql = "SELECT docNumero FROM PIN_MCoordina WHERE docTipo = 'COO'";
  } else {
    const ventana = textoFechaAccess(new Date(Date.now() - VENTANA_DIAS * 86_400_000));
    const desde = literalFechaAccess(new Date(ctx.desde.getTime() - MARGEN_MS));
    sql =
      'SELECT m.docNumero FROM PIN_MCoordina AS m LEFT JOIN dDocUsuario AS u ON (u.bodCodigo = m.bodCodigo AND u.docTipo = m.docTipo AND u.docNumero = m.docNumero) ' +
      `WHERE m.docTipo = 'COO' AND (m.docFecha >= '${ventana}' OR u.docFecAct >= ${desde})`;
  }
  const rows = await ctx.legacy.queryBridge<AccessRow>(sql);
  return [...new Set(rows.map((r) => int(r.docNumero)).filter((n): n is number => n !== null))].sort(
    (a, b) => a - b,
  );
}

/** Lee un trozo de coordinaciones con todas sus tablas (una consulta por tabla). */
async function leerTrozo(ctx: SyncContext, nums: number[]): Promise<CoordinacionRow[]> {
  const q = (sql: string) => ctx.legacy.queryBridge<AccessRow>(sql);
  const w = `docTipo = 'COO' AND docNumero IN (${IN(nums)})`;
  // Secuencial a propósito: Access lleva mal la concurrencia.
  const cabs = await q(
    'SELECT m.docNumero, m.docFecha, m.docRefer, m.docEstado, m.docExtra, m.docDestino, m.docFITODestino, m.docNota, m.docCert, m.embCodigo, m.docCA, m.docCFE, m.docGuiaRemision, ' +
      'd.docNumero AS dDoc, d.marCodigo, d.aerCodigo, d.docNumGuia, d.docFulls, d.docCajas, d.docKgs, d.docVOL, d.shiCodigo, d.docCupoFulls, d.docCO, d.docFITO, d.awbFactura, ' +
      'u.docFecCre, u.docUsuCre, u.docFecAct, u.docUsuAct ' +
      'FROM ((PIN_MCoordina AS m LEFT JOIN PIN_dDocCoor AS d ON (d.bodCodigo = m.bodCodigo AND d.docTipo = m.docTipo AND d.docNumero = m.docNumero)) ' +
      'LEFT JOIN dDocUsuario AS u ON (u.bodCodigo = m.bodCodigo AND u.docTipo = m.docTipo AND u.docNumero = m.docNumero)) ' +
      `WHERE m.docTipo = 'COO' AND m.docNumero IN (${IN(nums)})`,
  );
  const extras = primeroPorDoc(await q(`SELECT * FROM PIN_dDocExtra WHERE ${w}`));
  const rutas = primeroPorDoc(await q(`SELECT * FROM PIN_dDocRuta WHERE ${w}`));
  const caes = primeroPorDoc(await q(`SELECT * FROM PIN_DCoorCAE WHERE ${w}`));
  const marcas = porDoc(await q(`SELECT docNumero, detNumero, marCodigo FROM PIN_dDocMar WHERE ${w}`));
  const medidas = porDoc(
    await q(`SELECT docNumero, detNumero, Dim1, Dim2, Dim3, BXS, PCS, KGS FROM PIN_DCooMedidas WHERE ${w}`),
  );
  const lineas = porDoc(
    await q(
      'SELECT docNumero, detNumero, marCodigo, plaCodigo, proCodigo, detFull, detCajas, detKgs, detFUE, detFecha, detGuiaHija, detFactura, detValor, detDim1, detDim2, detDim3, detNumStems, detUser, detNota, detOrigen, detSecuencial ' +
        `FROM PIN_DCoordina WHERE ${w}`,
    ),
  );
  return cabs
    .map((cab) => {
      const n = int(cab.docNumero)!;
      const k = String(n);
      return {
        docNumero: n,
        cab,
        extra: extras.get(n) ?? null,
        ruta: rutas.get(n) ?? null,
        cae: caes.get(n) ?? null,
        marcas: marcas.get(k) ?? [],
        medidas: medidas.get(k) ?? [],
        lineas: lineas.get(k) ?? [],
      };
    })
    .sort((a, b) => a.docNumero - b.docNumero);
}

const ESTADO: Record<number, 'BORRADOR' | 'CORTADO' | 'ANULADO'> = {
  0: 'ANULADO',
  1: 'BORRADOR',
  2: 'CORTADO',
};

/** Factor fulls/caja → código de TipoCaja (las líneas mixtas quedan sin tipo). */
function codigoTipoCaja(fulls: number | null, cajas: number | null): string | null {
  if (!fulls || !cajas) return null;
  const f = Math.round((fulls / cajas) * 10_000) / 10_000;
  return f === 1 ? 'FB' : f === 0.5 ? 'HB' : f === 0.25 ? 'QB' : f === 0.125 ? 'EB' : null;
}

/** Los valores de PIN_dDocExtra con sufijo (`''` normal, `'_ex'` corte extra). */
function liquidacion(x: AccessRow, s: '' | '_ex') {
  const v = (c: string) => num(x[`${c}${s}`]);
  return {
    pesoCobrable: v('extCWeight'),
    tarifa: v('extRate'),
    guiaAerea: v('extGuiaAerea'),
    combustible: v('extCombustible'),
    seguridad: v('extSeguridad'),
    otros: v('extOtros'),
    iva: v('extIVA'),
    handling: v('extHandling'),
    cargoAwa: v('extCodAgeAWA'),
    cargoCha: v('extCodAgeCHA'),
    cargoPca: v('extCodAgePCA'),
    cargoTax: v('extCodAgeTAX'),
    cargoMma: v('extCodAgeMMA'),
    cargoHawb: v('extCodAgeHAWB'),
    cargoFitos: v('extCodAgeFITOS'),
    aux1: v('extAux1'),
    aux2: v('extAux2'),
    aux3Handling: v('extAux3Handling'),
    calAux: v('extCalAux'),
  };
}

const TRAMOS = [
  { tipo: 'ORIGEN', col: 'rutFrom', ref: 'origen', n: 0 },
  { tipo: 'DESTINO1', col: 'rutTo1', ref: 'destino', n: 0 },
  { tipo: 'VIA1', col: 'rutBy1', ref: 'via', n: 1 },
  { tipo: 'DESTINO2', col: 'rutTo2', ref: 'destino', n: 0 },
  { tipo: 'VIA2', col: 'rutBy2', ref: 'via', n: 2 },
  { tipo: 'DESTINO3', col: 'rutTo3', ref: 'destino', n: 0 },
  { tipo: 'VIA3', col: 'rutBy3', ref: 'via', n: 3 },
] as const;

function rutas(r: AccessRow, ctx: SyncContext) {
  const out: Array<Record<string, unknown>> = [];
  TRAMOS.forEach((t, i) => {
    const codigo = txt(r[t.col]);
    const vuelo = t.n ? txt(r[`rutVuelo${t.n}`]) : null;
    if (!codigo && !vuelo) return;
    const confirmada = (c: string) => (r[c] === null || r[c] === undefined ? null : flag(r[c]));
    out.push({
      tipoRuta: t.tipo,
      orden: i + 1,
      codigo,
      origenId: t.ref === 'origen' ? idDe(ctx, 'origen', codigo) : null,
      destinoId: t.ref === 'destino' ? idDe(ctx, 'destino', codigo) : null,
      viaAerolineaId: t.ref === 'via' ? idDe(ctx, 'aerolinea:iata', codigo) : null,
      vuelo,
      fechaHoraSalida: t.n ? fechaHora(r[`rutFecHorSal${t.n}`]) : null,
      fechaHoraLlegada: t.n ? fechaHora(r[`rutFecHorArr${t.n}`]) : null,
      salidaTipo: t.n ? txt(r[`rutTimeDeparture${t.n}`]) : null,
      llegadaTipo: t.n ? txt(r[`rutTimeArrival${t.n}`]) : null,
      salidaConfirmada: t.n ? confirmada(`rutConfirmSal${t.n}`) : null,
      llegadaConfirmada: t.n ? confirmada(`rutConfirmArr${t.n}`) : null,
    });
  });
  return out;
}

function manifiesto(cae: AccessRow | null, ruta: AccessRow | null) {
  const m = cae
    ? {
        origen: txt(cae.caeFrom),
        aduana: txt(cae.caeAduana),
        anio: txt(cae.caeAnio),
        tipo: txt(cae.caeTipo),
        numero: txt(cae.caeManifiesto),
        digitoVerificador: txt(cae.caeDV),
        vuelo: txt(cae.caeVuelo),
        fechaArribo: txt(cae.caeFecArr),
        horaArribo: txt(cae.caeHorArr),
        secuencial: txt(cae.Secuencial) ?? txt(ruta?.Secuencial),
        referencia: txt(ruta?.Manifiesto),
      }
    : {
        origen: txt(ruta?.rutFrom),
        aduana: txt(ruta?.caeAduana),
        anio: txt(ruta?.caeAnio),
        tipo: txt(ruta?.caeTipo),
        numero: txt(ruta?.caeManifiesto),
        digitoVerificador: txt(ruta?.caeDV),
        vuelo: null,
        fechaArribo: null,
        horaArribo: null,
        secuencial: txt(ruta?.Secuencial),
        referencia: txt(ruta?.Manifiesto),
      };
  return m.numero || m.referencia ? m : null;
}

/** Valores que Access guarda sin semántica confirmada: se conservan tal cual. */
function datosLegacy(c: AccessRow, x: AccessRow | null) {
  const out: Record<string, unknown> = {};
  const pon = (k: string, v: unknown) => {
    const n = typeof v === 'number' ? num(v) : txt(v);
    if (n !== null && n !== 0) out[k] = n;
  };
  for (const k of ['docCA', 'docCFE', 'docCert', 'docExtra', 'docGuiaRemision', 'docCO', 'docFITO', 'awbFactura']) {
    pon(k, c[k]);
  }
  if (x) for (const k of ['extRuta', 'extMenAero', 'TIPOFITO']) pon(k, x[k]);
  return out;
}

/**
 * Coordinación (PIN_MCoordina 'COO' + PIN_dDocCoor + PIN_dDocExtra +
 * PIN_dDocRuta + PIN_DCoorCAE + PIN_dDocMar + PIN_DCooMedidas + PIN_DCoordina)
 * → DocumentoCoordinacion con sus rutas, liquidaciones, manifiesto, marcas,
 * medidas y guías hijas (líneas de PIN_DCoordina agrupadas por detGuiaHija).
 *
 * Si algo cambió, los hijos se reemplazan completos. Las coordinaciones
 * anuladas (docEstado 0) no tienen datos en Access: se borran de PG.
 */
export const coordinacion: EntidadSync<CoordinacionRow, any, Tx> = {
  entidad: 'coordinacion',
  incremental: true,
  leer: (ctx) =>
    (async function* () {
      const nums = await numerosALeer(ctx);
      for (const trozo of trozos(nums, POR_TROZO)) {
        yield await leerTrozo(ctx, trozo);
      }
    })(),
  clave: (r) => String(r.docNumero),
  mapear: (r, ctx) => {
    const c = r.cab;
    const estado = ESTADO[int(c.docEstado) ?? -1];
    if (estado === 'ANULADO') {
      // Si ya estaba en PG (se anuló después de sincronizarla) se borra; si no, no hay nada que traer.
      return idDe(ctx, 'coordinacion', r.docNumero) !== null
        ? { anulada: true, codigoAccess: r.docNumero }
        : { omitir: 'anulada en Access (sin datos)' };
    }
    if (c.dDoc === null || c.dDoc === undefined) return { omitir: 'sin datos de coordinación (PIN_dDocCoor)' };

    const awb = normalizarAwb(c.docNumGuia);
    const idGuiaMadre = idDe(ctx, 'guiaMadre', awb);
    if (idGuiaMadre === null) return { omitir: `la guía madre ${txt(c.docNumGuia)} no está en el stock sincronizado` };

    const x = r.extra;
    const fechaVuelo = fechaDia(x?.extFechaDespacho) ?? fechaDia(c.docFecha);
    if (!fechaVuelo) return { omitir: 'sin fecha de despacho' };

    const liquidaciones: Array<Record<string, unknown>> = [];
    if (x) {
      liquidaciones.push({ tipo: 'NORMAL', ...liquidacion(x, ''), auxOtros: num(x.extAuxOtros), tarifaAcordada: num(x.extRateAgree), calculaPca: null });
      const ex = liquidacion(x, '_ex');
      if (flag(x.extCorte_ex) || Object.values(ex).some((v) => v)) {
        liquidaciones.push({ tipo: 'CORTE_EXTRA', ...ex, auxOtros: null, tarifaAcordada: null, calculaPca: flag(x.extCalPCA_ex) });
      }
    }

    // Guías hijas: líneas agrupadas por detGuiaHija.
    const grupos = agrupar(r.lineas, (l) => txt(l.detGuiaHija));
    const tipoCaja = (l: AccessRow) => idDe(ctx, 'tipoCaja', codigoTipoCaja(num(l.detFull), num(l.detCajas)));
    const anio = fechaVuelo.getUTCFullYear();
    const guiasHijas = [...grupos.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([ngh, lineas]) => {
        const p = lineas[0];
        const suma = (k: string) => lineas.reduce((s, l) => s + (num(l[k]) ?? 0), 0);
        return {
          numeroGuiaHija: ngh,
          anio,
          secuencial: int(ngh) ?? 0,
          idFinca: idDe(ctx, 'finca', p.plaCodigo),
          idConsignatario: idDe(ctx, 'consignatario', p.marCodigo),
          dae: txt(p.detFUE),
          pesoBruto: Math.round(suma('detKgs') * 1e6) / 1e6,
          totalPiezas: Math.round(suma('detCajas')),
          totalFulls: Math.round(suma('detFull') * 1e6) / 1e6,
          detalles: lineas.map((l) => ({
            numeroLinea: int(l.detNumero),
            idProducto: idDe(ctx, 'producto', l.proCodigo),
            codigoProducto: txt(l.proCodigo),
            idFinca: idDe(ctx, 'finca', l.plaCodigo),
            idConsignatario: idDe(ctx, 'consignatario', l.marCodigo),
            idTipoCaja: tipoCaja(l),
            cantidadCajas: Math.round(num(l.detCajas) ?? 0),
            fulls: num(l.detFull),
            pesoKg: num(l.detKgs),
            tallos: int(l.detNumStems),
            valor: num(l.detValor),
            dae: txt(l.detFUE),
            largo: num(l.detDim1),
            ancho: num(l.detDim2),
            alto: num(l.detDim3),
            factura: txt(l.detFactura),
            nota: txt(l.detNota),
            origen: txt(l.detOrigen),
            usuario: txt(l.detUser),
            fechaRegistro: fechaHora(l.detFecha),
            secuencialLegacy: int(numSin0(l.detSecuencial)),
          })),
        };
      });

    return {
      base: {
        codigoAccess: r.docNumero,
        idGuiaMadre,
        numeroGuia: txt(c.docNumGuia),
        tarifaRate: num(x?.extRate) ?? 0,
        idAgenciaIata: idDe(ctx, 'agenciaIata', c.shiCodigo),
        idDestinoAwb: idDe(ctx, 'destino', c.docDestino),
        idDestinoFinalDocs: idDe(ctx, 'destino', c.docFITODestino),
        idConsignatario: idDe(ctx, 'consignatario', c.marCodigo),
        idAerolinea: idDe(ctx, 'aerolinea', c.aerCodigo),
        idTipoEmbarque: idDe(ctx, 'tipoEmbarque', c.embCodigo),
        estadoActual: estado ?? 'BORRADOR',
        pago: txt(x?.extPago) === 'CC' ? 'COLLECT' : 'PREPAID',
        fechaVuelo,
        fechaAsignacion: fechaDia(c.docFecha) ?? fechaVuelo,
        referencia: txt(c.docRefer),
        nota: txt(c.docNota),
        totalFulls: num(c.docFulls),
        totalCajas: num(c.docCajas),
        totalKgs: num(c.docKgs),
        totalVolumen: num(c.docVOL),
        cupoFulls: num(c.docCupoFulls),
        corteExtra: flag(x?.extCorte_ex),
        liqFulls: num(x?.docBXS),
        liqPiezas: int(x?.docPCS),
        liqPesoBruto: num(x?.docGW),
        liqPesoCobrable: num(x?.docCW),
        liqTarifa: num(x?.docRate),
        liqFlete: num(x?.docFlete),
        // Ojo: Access guarda los cargos de aerolínea en docDA y los de agencia en docDC.
        liqDueCarrier: num(x?.docDA),
        liqDueAgent: num(x?.docDC),
        liqTotal: num(x?.docTotal),
        comision: num(x?.docComision),
        incentivo: num(x?.docIncentivo),
        certificadoOrigen: txt(x?.extCO),
        ingresoId: int(numSin0(x?.IngresoID)),
        datosLegacy: datosLegacy(c, x),
        creadoPorLegacy: txt(c.docUsuCre),
        creadoEnLegacy: fechaHora(c.docFecCre),
        actualizadoPorLegacy: txt(c.docUsuAct),
        actualizadoEnLegacy: fechaHora(c.docFecAct),
      },
      rutas: r.ruta ? rutas(r.ruta, ctx) : [],
      liquidaciones,
      manifiesto: manifiesto(r.cae, r.ruta),
      marcas: r.marcas.map((m) => ({ orden: int(m.detNumero) ?? 0, idConsignatario: idDe(ctx, 'consignatario', m.marCodigo) })),
      medidas: r.medidas.map((m) => ({
        orden: int(m.detNumero) ?? 0,
        largo: num(m.Dim1),
        ancho: num(m.Dim2),
        alto: num(m.Dim3),
        fulls: num(m.BXS),
        piezas: int(m.PCS),
        kgs: num(m.KGS),
      })),
      guiasHijas,
    };
  },
  guardar: async (db, d) => {
    if (d.anulada) {
      // Access borra el detalle de las anuladas y libera la guía madre.
      await db.documentoCoordinacion.deleteMany({ where: { codigoAccess: d.codigoAccess } });
      return null;
    }
    const { id } = await db.documentoCoordinacion.upsert({
      where: { codigoAccess: d.base.codigoAccess },
      create: d.base,
      update: d.base,
      select: { id: true },
    });
    const w = { where: { idDocumentoCoordinacion: id } };
    await db.guiaHija.deleteMany(w);
    await db.documentoRuta.deleteMany(w);
    await db.documentoLiquidacion.deleteMany(w);
    await db.documentoManifiesto.deleteMany(w);
    await db.documentoMarca.deleteMany(w);
    await db.documentoMedida.deleteMany(w);
    const conId = (rows: Array<Record<string, unknown>>): any[] =>
      rows.map((x) => ({ ...x, idDocumentoCoordinacion: id }));
    if (d.rutas.length) await db.documentoRuta.createMany({ data: conId(d.rutas) });
    if (d.liquidaciones.length) await db.documentoLiquidacion.createMany({ data: conId(d.liquidaciones) });
    if (d.marcas.length) await db.documentoMarca.createMany({ data: conId(d.marcas) });
    if (d.medidas.length) await db.documentoMedida.createMany({ data: conId(d.medidas) });
    if (d.manifiesto) await db.documentoManifiesto.create({ data: { ...d.manifiesto, idDocumentoCoordinacion: id } });
    for (const { detalles, ...gh } of d.guiasHijas) {
      await db.guiaHija.create({
        data: {
          ...gh,
          idDocumentoCoordinacion: id,
          idGuiaMadre: d.base.idGuiaMadre,
          detalles: { createMany: { data: detalles } },
        },
      });
    }
    return id;
  },
  desactivar: async (db, id) => {
    // Ya no existe en Access: se borra con todos sus hijos (nadie más la referencia).
    await db.documentoCoordinacion.deleteMany({ where: { id } });
  },
};
