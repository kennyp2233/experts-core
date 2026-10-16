import {
  TIPOS_CARGA_ECUAPASS,
  TIPOS_EMBALAJE_ECUAPASS,
} from '../../data/catalogos-ecuapass';
import { flag, int, txt } from '../../engine/normalize';
import { AccessRow, EntidadSync } from '../../engine/sync.types';

/** CAE_TIPODOCUMENTO → TipoDocumentoIdentidad (1 RUC, 2 cédula, …). */
export const tipoDocumentoIdentidad: EntidadSync<AccessRow, { codigo: number; nombre: string }> = {
  entidad: 'tipoDocumentoIdentidad',
  leer: (ctx) => ctx.legacy.queryBridge('SELECT ID, Nombre FROM CAE_TIPODOCUMENTO'),
  clave: (r) => txt(r.ID),
  mapear: (r) => {
    const codigo = int(r.ID);
    const nombre = txt(r.Nombre);
    if (codigo === null || !nombre) return { omitir: 'sin código o nombre' };
    return { codigo, nombre };
  },
  guardar: async (db, d) =>
    (
      await db.tipoDocumentoIdentidad.upsert({
        where: { codigo: d.codigo },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
};

/** CAE_ADUANA → CaeAduana (distritos aduaneros: "055" Quito, …). */
export const caeAduana: EntidadSync<
  AccessRow,
  { codigo: string; codigoAduana: number | null; nombre: string }
> = {
  entidad: 'caeAduana',
  leer: (ctx) => ctx.legacy.queryBridge('SELECT ID, Nombre FROM CAE_ADUANA'),
  clave: (r) => txt(r.ID),
  mapear: (r) => {
    const codigo = txt(r.ID)!;
    const nombre = txt(r.Nombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return { codigo, codigoAduana: int(codigo), nombre };
  },
  guardar: async (db, d) =>
    (
      await db.caeAduana.upsert({
        where: { codigo: d.codigo },
        create: d,
        update: d,
        select: { idCaeAduana: true },
      })
    ).idCaeAduana,
};

interface CodigoNombre {
  codigo: string;
  nombre: string;
}

const desdeTabla = (rows: ReadonlyArray<readonly [string, string]>) =>
  Promise.resolve(rows.map(([codigo, nombre]) => ({ codigo, nombre })));

/** Catálogo ECUAPASS de tipos de carga (fijo, ver data/catalogos-ecuapass.ts). */
export const tipoCarga: EntidadSync<CodigoNombre, CodigoNombre> = {
  entidad: 'tipoCarga',
  leer: () => desdeTabla(TIPOS_CARGA_ECUAPASS),
  clave: (r) => r.codigo,
  mapear: (r) => r,
  guardar: async (db, d) =>
    (
      await db.tipoCarga.upsert({
        where: { codigo: d.codigo },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
};

/** Catálogo ECUAPASS de tipos de embalaje (fijo, ver data/catalogos-ecuapass.ts). */
export const tipoEmbalaje: EntidadSync<CodigoNombre, CodigoNombre> = {
  entidad: 'tipoEmbalaje',
  leer: () => desdeTabla(TIPOS_EMBALAJE_ECUAPASS),
  clave: (r) => r.codigo,
  mapear: (r) => r,
  guardar: async (db, d) =>
    (
      await db.tipoEmbalaje.upsert({
        where: { codigo: d.codigo },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
};

/** mipro_tipos_certificado → AcuerdoArancelario (SGP-UE, SGP-FR, EUR1, …). */
export const acuerdoArancelario: EntidadSync = {
  entidad: 'acuerdoArancelario',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT ID, Alias, TIPO_CERTIFICADO, TIPO_ACUERDO, DEFAULT_Descrip, DEFAULT_TariffCode, DEFAULT_DJOCode, Estado, OriginCriterion FROM mipro_tipos_certificado',
    ),
  clave: (r) => txt(r.ID),
  mapear: (r) => ({
    codigoAccess: int(r.ID),
    nombre: txt(r.Alias) ?? txt(r.TIPO_ACUERDO) ?? `Acuerdo ${txt(r.ID)}`,
    tipoCertificado: txt(r.TIPO_CERTIFICADO),
    tipoAcuerdo: txt(r.TIPO_ACUERDO),
    descripcionDefault: txt(r.DEFAULT_Descrip),
    tariffCodeDefault: txt(r.DEFAULT_TariffCode),
    djoCodeDefault: txt(r.DEFAULT_DJOCode),
    criterioOrigen: txt(r.OriginCriterion),
    // En las tablas mipro_* el estado activo es 1 (al revés que en las PIN_*).
    estado: flag(r.Estado),
  }),
  guardar: async (db, d: any) =>
    (
      await db.acuerdoArancelario.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { idAcuerdo: true },
      })
    ).idAcuerdo,
  desactivar: async (db, id) => {
    await db.acuerdoArancelario.updateMany({ where: { idAcuerdo: id }, data: { estado: false } });
  },
};
