import { idDe } from '../../engine/sync-engine';
import { activoPin, int, multilinea, num, txt } from '../../engine/normalize';
import { EntidadSync } from '../../engine/sync.types';

/** PIN_auxChofers → Chofer. */
export const chofer: EntidadSync = {
  entidad: 'chofer',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT choCodigo, choNombre, choCI, choPlacas, choFono, choCamion, choEstado FROM PIN_auxChofers',
    ),
  clave: (r) => txt(r.choCodigo),
  mapear: (r) => {
    const nombre = txt(r.choNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.choCodigo),
      nombre,
      ruc: txt(r.choCI) ?? '',
      placasCamion: txt(r.choPlacas),
      telefono: txt(r.choFono),
      camion: txt(r.choCamion),
      estado: activoPin(r.choEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.chofer.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.chofer.updateMany({ where: { id }, data: { estado: false } });
  },
};

/**
 * PIN_auxBodegueros → Bodeguero. Ojo: Access guarda la clave en texto plano
 * y así se copia (mismo comportamiento que el modelo actual).
 */
export const bodeguero: EntidadSync = {
  entidad: 'bodeguero',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT bodID, bodNombre, bodCI, bodPWD, bodEstado FROM PIN_auxBodegueros',
    ),
  clave: (r) => txt(r.bodID),
  mapear: (r) => {
    const nombre = txt(r.bodNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.bodID),
      nombre,
      ci: txt(r.bodCI) ?? '',
      claveBodega: txt(r.bodPWD) ?? '',
      estado: activoPin(r.bodEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.bodeguero.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.bodeguero.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** PIN_auxFuncionarios → FuncionarioAgrocalidad. */
export const funcionarioAgrocalidad: EntidadSync = {
  entidad: 'funcionarioAgrocalidad',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT funCodigo, funNombre, funFono, funEMail, funEstado FROM PIN_auxFuncionarios',
    ),
  clave: (r) => txt(r.funCodigo),
  mapear: (r) => {
    const nombre = txt(r.funNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.funCodigo),
      nombre,
      telefono: txt(r.funFono),
      email: txt(r.funEMail),
      estado: activoPin(r.funEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.funcionarioAgrocalidad.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.funcionarioAgrocalidad.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** PIN_auxSubagencias → SubAgencia. */
export const subAgencia: EntidadSync = {
  entidad: 'subAgencia',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT ageCodigo, ageRUC, ageNombre, ageAlias, ageDireccion, ageFono, ageEmail, ageCiudad, ageProvincia, agePais, ageRepresentante, ageComision, ageEstado FROM PIN_auxSubagencias',
    ),
  clave: (r) => txt(r.ageCodigo),
  mapear: (r) => {
    const nombre = txt(r.ageNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.ageCodigo),
      nombre,
      alias: txt(r.ageAlias),
      ciRuc: txt(r.ageRUC),
      direccion: multilinea(r.ageDireccion),
      telefono: txt(r.ageFono),
      email: txt(r.ageEmail),
      ciudad: txt(r.ageCiudad),
      pais: txt(r.agePais),
      provincia: txt(r.ageProvincia),
      representante: txt(r.ageRepresentante),
      comision: num(r.ageComision),
      estado: activoPin(r.ageEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.subAgencia.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.subAgencia.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** PIN_auxShippers → AgenciaIata (shipper + carrier IATA + códigos CAE). */
export const agenciaIata: EntidadSync = {
  entidad: 'agenciaIata',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT shiCodigo, shiNombre, shiRUC, shiDireccion, shiFono, shiCiudad, shiPais, iatNombre, iatRUC, iatDireccion, iatFono, iatCiudad, iatPais, iatCode, shiEstado, shiComision, shiID, caeOC, caeCC, shiAlias FROM PIN_auxShippers',
    ),
  clave: (r) => txt(r.shiCodigo),
  mapear: (r) => {
    const nombreShipper = txt(r.shiNombre);
    if (!nombreShipper) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.shiCodigo),
      alias: txt(r.shiAlias),
      nombreShipper,
      rucShipper: txt(r.shiRUC),
      direccionShipper: multilinea(r.shiDireccion),
      telefonoShipper: txt(r.shiFono),
      ciudadShipper: txt(r.shiCiudad),
      paisShipper: txt(r.shiPais),
      nombreCarrier: txt(r.iatNombre),
      rucCarrier: txt(r.iatRUC),
      direccionCarrier: multilinea(r.iatDireccion),
      telefonoCarrier: txt(r.iatFono),
      ciudadCarrier: txt(r.iatCiudad),
      paisCarrier: txt(r.iatPais),
      iataCodeCarrier: txt(r.iatCode),
      registroExportador: txt(r.shiID),
      codigoOperador: txt(r.caeOC),
      codigoConsolidador: txt(r.caeCC),
      comision: num(r.shiComision),
      estado: activoPin(r.shiEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.agenciaIata.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.agenciaIata.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** PIN_auxEmbarque → TipoEmbarque (FLORES, …), con tipo de carga/embalaje ECUAPASS. */
export const tipoEmbarque: EntidadSync = {
  entidad: 'tipoEmbarque',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT embCodigo, embNombre, embOrden, embComodityCode, ecuTipoCarga, ecuTipoEmbalaje, ecuRegimen, ecuMercancia FROM PIN_auxEmbarque',
    ),
  clave: (r) => txt(r.embCodigo),
  mapear: (r, ctx) => ({
    codigo: txt(r.embCodigo),
    nombre: txt(r.embCodigo),
    descripcionGuia: multilinea(r.embNombre),
    idTipoCarga: idDe(ctx, 'tipoCarga', r.ecuTipoCarga),
    idTipoEmbalaje: idDe(ctx, 'tipoEmbalaje', r.ecuTipoEmbalaje),
    regimen: txt(r.ecuRegimen),
    mercancia: txt(r.ecuMercancia),
    harmonisedCommodity: txt(r.embComodityCode),
    orden: int(r.embOrden),
  }),
  guardar: async (db, d: any) =>
    (
      await db.tipoEmbarque.upsert({
        where: { codigo: d.codigo },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
};
