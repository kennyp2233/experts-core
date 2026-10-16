import { idDe } from '../../engine/sync-engine';
import { activoPin, agrupar, flag, int, num, txt } from '../../engine/normalize';
import { AccessRow, EntidadSync } from '../../engine/sync.types';

/** PIN_auxPlantaciones → Finca. */
export const finca: EntidadSync = {
  entidad: 'finca',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT plaCodigo, plaRUC, plaNombre, plaAlias, plaDireccion, plaFono, plaEmail, plaCiudad, plaProvincia, plaPais, plaPaisSigla, plaDim1, plaDim2, plaDim3, plaEstado, plaGuiasCertif, plaSESA, plaTipoDocumento, agroCodigo, agroRazonSocial, agroDireccion FROM PIN_auxPlantaciones',
    ),
  clave: (r) => txt(r.plaCodigo),
  mapear: (r) => {
    const nombreFinca = txt(r.plaNombre);
    if (!nombreFinca) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.plaCodigo),
      nombreFinca,
      tag: txt(r.plaAlias),
      rucFinca: txt(r.plaRUC),
      // CAE_TIPODOCUMENTO: 1 = RUC (todas las fincas hoy).
      tipoDocumento: String(int(r.plaTipoDocumento) ?? 1),
      direccion: txt(r.plaDireccion),
      generaGuiasCertificadas: flag(r.plaGuiasCertif),
      iGeneralTelefono: txt(r.plaFono),
      iGeneralEmail: txt(r.plaEmail),
      iGeneralCiudad: txt(r.plaCiudad),
      iGeneralProvincia: txt(r.plaProvincia),
      iGeneralPais: txt(r.plaPais),
      iGeneralCodSesa: txt(r.plaSESA),
      iGeneralCodPais: txt(r.plaPaisSigla),
      aNombre: txt(r.agroRazonSocial),
      aCodigo: txt(r.agroCodigo),
      aDireccion: txt(r.agroDireccion),
      cajaLargo: num(r.plaDim1),
      cajaAncho: num(r.plaDim2),
      cajaAlto: num(r.plaDim3),
      estado: activoPin(r.plaEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.finca.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.finca.updateMany({ where: { id }, data: { estado: false } });
  },
};

interface GrupoRow {
  clave: string;
  items: AccessRow[];
}

/** PIN_auxPlanProductos → FincaProducto (qué productos vende cada finca). */
export const fincaProducto: EntidadSync<GrupoRow> = {
  entidad: 'fincaProducto',
  leer: async (ctx) => {
    const rows = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT plaCodigo, proCodigo, proNombre FROM PIN_auxPlanProductos',
    );
    return [...agrupar(rows, (r) => txt(r.plaCodigo)).entries()].map(([clave, items]) => ({
      clave,
      items: items.sort((a, b) =>
        `${txt(a.proCodigo)}|${txt(a.proNombre)}`.localeCompare(`${txt(b.proCodigo)}|${txt(b.proNombre)}`),
      ),
    }));
  },
  clave: (g) => g.clave,
  mapear: (g, ctx) => {
    const idFinca = idDe(ctx, 'finca', g.clave);
    if (idFinca === null) return { omitir: 'la finca no está sincronizada' };
    const faltan = g.items.filter((i) => idDe(ctx, 'producto', i.proCodigo) === null);
    if (faltan.length > 0) {
      return { omitir: `productos sin sincronizar: ${faltan.map((i) => txt(i.proCodigo)).join(', ')}` };
    }
    return {
      idFinca,
      items: g.items.map((i) => ({
        idProducto: idDe(ctx, 'producto', i.proCodigo)!,
        nombre: txt(i.proNombre),
      })),
    };
  },
  guardar: async (db, d: any) => {
    await db.fincaProducto.deleteMany({ where: { idFinca: d.idFinca } });
    await db.fincaProducto.createMany({
      data: d.items.map((i: object) => ({ ...i, idFinca: d.idFinca })),
    });
    return d.idFinca;
  },
  desactivar: async (db, idFinca) => {
    await db.fincaProducto.deleteMany({ where: { idFinca } });
  },
};

/** pin_auxagrocalidad → RegistroAgrocalidad (sitios de producción registrados). */
export const registroAgrocalidad: EntidadSync = {
  entidad: 'registroAgrocalidad',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT ID, Codigo, RazonSocial, Provincia, Canton, Direccion, plaCodigo, strCod FROM pin_auxagrocalidad',
    ),
  clave: (r) => txt(r.ID),
  mapear: (r, ctx) => {
    const codigo = txt(r.Codigo);
    if (!codigo) return { omitir: 'sin código Agrocalidad' };
    // plaCodigo = -1 → no está enlazado a ninguna finca.
    const pla = int(r.plaCodigo);
    return {
      codigoAccess: int(r.ID),
      codigo,
      razonSocial: txt(r.RazonSocial) ?? '',
      provincia: txt(r.Provincia),
      canton: txt(r.Canton),
      direccion: txt(r.Direccion),
      strCod: txt(r.strCod),
      idFinca: pla === null || pla < 0 ? null : idDe(ctx, 'finca', pla),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.registroAgrocalidad.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
};
