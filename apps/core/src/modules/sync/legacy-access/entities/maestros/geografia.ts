import { idDe } from '../../engine/sync-engine';
import { activoPin, flag, int, numSin0, txt } from '../../engine/normalize';
import { EntidadSync } from '../../engine/sync.types';

/** PIN_auxPaises → Pais (llave: siglas, ej. "EC"). */
export const pais: EntidadSync = {
  entidad: 'pais',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT paiCodigo, paiNombre, paiID, paiEstado, idAcuerdo FROM PIN_auxPaises',
    ),
  clave: (r) => txt(r.paiCodigo),
  mapear: (r, ctx) => {
    const nombre = txt(r.paiNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      siglasPais: txt(r.paiCodigo),
      nombre,
      paisId: int(numSin0(r.paiID)),
      idAcuerdo: idDe(ctx, 'acuerdoArancelario', r.idAcuerdo),
      estado: activoPin(r.paiEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.pais.upsert({
        where: { siglasPais: d.siglasPais },
        create: d,
        update: d,
        select: { idPais: true },
      })
    ).idPais,
  desactivar: async (db, id) => {
    await db.pais.updateMany({ where: { idPais: id }, data: { estado: false } });
  },
};

/** PIN_auxDestinos (todo lo que no es origen) → Destino (llave: código IATA). */
export const destino: EntidadSync = {
  entidad: 'destino',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      "SELECT desCodigo, desNombre, desAeropuerto, paiCodigo, desEstado, desLeyendaFITO, desFITO, desID FROM PIN_auxDestinos WHERE desTipo <> 'ORI' OR desTipo IS NULL",
    ),
  clave: (r) => txt(r.desCodigo),
  mapear: (r, ctx) => {
    const sesa = int(numSin0(r.desID));
    return {
      codigo: txt(r.desCodigo),
      nombre: txt(r.desNombre),
      aeropuerto: txt(r.desAeropuerto),
      idPais: idDe(ctx, 'pais', r.paiCodigo),
      sesaId: sesa === null ? null : String(sesa),
      leyendaFito: txt(r.desLeyendaFITO),
      cobroFitos: flag(r.desFITO),
      estado: activoPin(r.desEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.destino.upsert({
        where: { codigo: d.codigo },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.destino.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** PIN_auxDestinos con desTipo = 'ORI' (UIO, GYE, LTX) → Origen. */
export const origen: EntidadSync = {
  entidad: 'origen',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      "SELECT desCodigo, desNombre, desAeropuerto, paiCodigo, desEstado, caeAduana FROM PIN_auxDestinos WHERE desTipo = 'ORI'",
    ),
  clave: (r) => txt(r.desCodigo),
  mapear: (r, ctx) => ({
    codigo: txt(r.desCodigo),
    nombre: txt(r.desNombre) ?? txt(r.desCodigo),
    aeropuerto: txt(r.desAeropuerto),
    idPais: idDe(ctx, 'pais', r.paiCodigo),
    idCaeAduana: idDe(ctx, 'caeAduana', r.caeAduana),
    estado: activoPin(r.desEstado),
  }),
  guardar: async (db, d: any) =>
    (
      await db.origen.upsert({
        where: { codigo: d.codigo },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.origen.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** PIN_auxOtrDes → OtroDestino (agrupaciones de destino de los aranceles). */
export const otroDestino: EntidadSync = {
  entidad: 'otroDestino',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT desCodigo, desNombre, desPlaMod, desPlaNom, desEstado FROM PIN_auxOtrDes',
    ),
  clave: (r) => txt(r.desCodigo),
  mapear: (r) => {
    const nombre = txt(r.desNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.desCodigo),
      nombre,
      plantillaModo: int(r.desPlaMod),
      plantillaNombre: txt(r.desPlaNom),
      estado: activoPin(r.desEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.otroDestino.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.otroDestino.updateMany({ where: { id }, data: { estado: false } });
  },
};
