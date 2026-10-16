import { idDe } from '../../engine/sync-engine';
import {
  activoPin,
  int,
  multilinea,
  num,
  parte,
  partes,
  todoNulo,
  txt,
} from '../../engine/normalize';
import { EntidadSync } from '../../engine/sync.types';

/** PIN_auxClientes → Embarcador. */
export const embarcador: EntidadSync = {
  entidad: 'embarcador',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT cliCodigo, cliRUC, cliNombre, cliAlias, cliDireccion, cliFono, cliEmail, cliCiudad, cliProvincia, cliPais, cliPaisSigla, cliHandling, cliEstado FROM PIN_auxClientes',
    ),
  clave: (r) => txt(r.cliCodigo),
  mapear: (r) => {
    const nombre = txt(r.cliNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.cliCodigo),
      nombre,
      alias: txt(r.cliAlias),
      ci: txt(r.cliRUC),
      direccion: multilinea(r.cliDireccion),
      telefono: txt(r.cliFono),
      email: txt(r.cliEmail),
      ciudad: txt(r.cliCiudad),
      provincia: txt(r.cliProvincia),
      pais: txt(r.cliPais),
      embarcadorCodigoPais: txt(r.cliPaisSigla),
      handling: num(r.cliHandling),
      estado: activoPin(r.cliEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.embarcador.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.embarcador.updateMany({ where: { id }, data: { estado: false } });
  },
};

/**
 * PIN_auxClientesAux → Cliente. Los cliCodAge*Val son los cargos de agencia
 * (según _PARAMETROS: 0 Form A, 1 Transport, 3 Termógrafo, 4 MCA).
 */
export const cliente: EntidadSync = {
  entidad: 'cliente',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT cliCodigo, cliRUC, cliNombre, cliAlias, cliDireccion, cliFono, cliEmail, cliCiudad, cliPais, cliPaisSigla, cliHandling, cliFITO, cliCodCon, cliCodAge0Val, cliCodAge1Val, cliCodAge3Val, cliCodAge4Val, cliNombreFac, cliRUCFac, cliDireccionFac, cliFonoFac, cliEstado FROM PIN_auxClientesAux',
    ),
  clave: (r) => txt(r.cliCodigo),
  mapear: (r) => {
    const nombre = txt(r.cliNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.cliCodigo),
      nombre,
      alias: txt(r.cliAlias),
      ruc: txt(r.cliRUC),
      direccion: multilinea(r.cliDireccion),
      telefono: txt(r.cliFono),
      email: txt(r.cliEmail),
      ciudad: txt(r.cliCiudad),
      pais: txt(r.cliPais),
      clienteCodigoPais: txt(r.cliPaisSigla),
      fitosValor: num(r.cliFITO),
      formA: int(r.cliCodAge0Val),
      transport: int(r.cliCodAge1Val),
      termo: int(r.cliCodAge3Val),
      mica: int(r.cliCodAge4Val),
      handling: num(r.cliHandling),
      cuentaContable: txt(r.cliCodCon),
      nombreFactura: txt(r.cliNombreFac),
      rucFactura: txt(r.cliRUCFac),
      direccionFactura: multilinea(r.cliDireccionFac),
      telefonoFactura: txt(r.cliFonoFac),
      estado: activoPin(r.cliEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.cliente.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.cliente.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** "nombre||dirección||tipoDoc||numDoc||siglasPaís||" (marCNE_CAE, marNFY_CAE, marCNEH_CAE). */
function cae(v: unknown) {
  return {
    nombre: parte(v, 0),
    direccion: parte(v, 1),
    tipoDocumento: parte(v, 2),
    documento: parte(v, 3),
    siglasPais: parte(v, 4),
  };
}

/** "nombre||dirección||ciudad||país||siglas||EORI||" (marCNE, marNFY, marCNEH). */
function transmision(v: unknown) {
  return {
    nombre: parte(v, 0),
    direccion: parte(v, 1),
    ciudad: parte(v, 2),
    pais: parte(v, 3),
    siglas: parte(v, 4),
    eori: parte(v, 5),
  };
}

/**
 * PIN_auxMarcas → Consignatario + sus 6 subtablas 1:1. Los textos con "||"
 * del sistema viejo son o bloques multilínea (datos de guía, FITO, Forma A)
 * o campos posicionales (CAE/SICE, transmisión), según la columna.
 */
export const consignatario: EntidadSync = {
  entidad: 'consignatario',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT marCodigo, marRUC, marNombre, marAlias, marDireccion, marFono, marEmail, marCiudad, marPais, marPaisSigla, marConsignee, marConsigneeData, cliCodigo, marNotify, marEstado, marConsigneeH, marConsigneeDataH, marNotifyH, marFITO, cliCodigoAux, marFormaA, marCNE, marNFY, marCNEH, marCNE_CAE, marNFY_CAE, marCNEH_CAE, marDesDefault, marXMLNombre, marXMLDireccion, marXMLPais, marFacRUC, marFacNombre, marFacDireccion, marFacFono FROM PIN_auxMarcas',
    ),
  clave: (r) => txt(r.marCodigo),
  mapear: (r, ctx) => {
    const nombre = txt(r.marNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    const cne = cae(r.marCNE_CAE);
    const nfy = cae(r.marNFY_CAE);
    const hwb = cae(r.marCNEH_CAE);
    const tCne = transmision(r.marCNE);
    const tNfy = transmision(r.marNFY);
    const tHwb = transmision(r.marCNEH);
    return {
      base: {
        codigoAccess: int(r.marCodigo),
        nombre,
        alias: txt(r.marAlias),
        ruc: txt(r.marRUC),
        direccion: multilinea(r.marDireccion),
        idEmbarcador: idDe(ctx, 'embarcador', r.cliCodigo),
        idCliente: idDe(ctx, 'cliente', r.cliCodigoAux),
        telefono: txt(r.marFono),
        email: txt(r.marEmail),
        ciudad: txt(r.marCiudad),
        pais: txt(r.marPais),
        paisSigla: txt(r.marPaisSigla),
        estado: activoPin(r.marEstado),
      },
      caeSice: {
        consigneeNombre: cne.nombre,
        consigneeDireccion: cne.direccion,
        consigneeTipoDocumento: cne.tipoDocumento,
        consigneeDocumento: cne.documento,
        consigneeSiglasPais: cne.siglasPais,
        notifyNombre: nfy.nombre,
        notifyDireccion: nfy.direccion,
        notifyTipoDocumento: nfy.tipoDocumento,
        notifyDocumento: nfy.documento,
        notifySiglasPais: nfy.siglasPais,
        hawbNombre: hwb.nombre,
        hawbDireccion: hwb.direccion,
        hawbTipoDocumento: hwb.tipoDocumento,
        hawbDocumento: hwb.documento,
        hawbSiglasPais: hwb.siglasPais,
      },
      transmision: {
        consigneeNombreTrans: tCne.nombre,
        consigneeDireccionTrans: tCne.direccion,
        consigneeCiudadTrans: tCne.ciudad,
        consigneePaisTrans: tCne.pais,
        consigneeSiglasPaisTrans: tCne.siglas,
        consigneeEueoriTrans: tCne.eori,
        notifyNombreTrans: tNfy.nombre,
        notifyDireccionTrans: tNfy.direccion,
        notifyCiudadTrans: tNfy.ciudad,
        notifyPaisTrans: tNfy.pais,
        notifySiglasPaisTrans: tNfy.siglas,
        notifyEueoriTrans: tNfy.eori,
        hawbNombreTrans: tHwb.nombre,
        hawbDireccionTrans: tHwb.direccion,
        hawbCiudadTrans: tHwb.ciudad,
        hawbPaisTrans: tHwb.pais,
        hawbSiglasPaisTrans: tHwb.siglas,
        hawbEueoriTrans: tHwb.eori,
      },
      fito: {
        fitoDeclaredName: txt(r.marXMLNombre),
        fitoDeclaredAddress: txt(r.marXMLDireccion),
        fitoPais: txt(r.marXMLPais),
        fitoFormaA: multilinea(r.marFormaA),
        fitoNombre: parte(r.marFITO, 0),
        fitoDireccion: multilinea(partes(r.marFITO).slice(1).join('||')),
      },
      guiaH: {
        guiaHConsignee: txt(r.marConsigneeH),
        guiaHNameAdress: multilinea(r.marConsigneeDataH),
        guiaHNotify: multilinea(r.marNotifyH),
      },
      guiaM: {
        guiaMConsignee: txt(r.marConsignee),
        guiaMNameAddress: multilinea(r.marConsigneeData),
        guiaMNotify: multilinea(r.marNotify),
        idDestino: idDe(ctx, 'destino', r.marDesDefault),
      },
      facturacion: {
        facturaNombre: txt(r.marFacNombre),
        facturaRuc: txt(r.marFacRUC),
        facturaDireccion: multilinea(r.marFacDireccion),
        facturaTelefono: txt(r.marFacFono),
      },
    };
  },
  guardar: async (db, d: any) => {
    const { id } = await db.consignatario.upsert({
      where: { codigoAccess: d.base.codigoAccess },
      create: d.base,
      update: d.base,
      select: { id: true },
    });
    await subtabla(db.consignatarioCaeSice, id, d.caeSice);
    await subtabla(db.consignatarioTransmision, id, d.transmision);
    await subtabla(db.consignatarioFito, id, d.fito);
    await subtabla(db.consignatarioGuiaH, id, d.guiaH);
    await subtabla(db.consignatarioGuiaM, id, d.guiaM);
    await subtabla(db.consignatarioFacturacion, id, d.facturacion);
    return id;
  },
  desactivar: async (db, id) => {
    await db.consignatario.updateMany({ where: { id }, data: { estado: false } });
  },
};

/** Delegado mínimo de una subtabla 1:1 de Consignatario (todas tienen PK idConsignatario). */
interface SubtablaDelegate {
  upsert(args: {
    where: { idConsignatario: number };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<unknown>;
  deleteMany(args: { where: { idConsignatario: number } }): Promise<unknown>;
}

/** Upsert de la subtabla, o la borra si Access no tiene ningún dato para ella. */
async function subtabla(
  delegate: unknown,
  idConsignatario: number,
  data: Record<string, unknown>,
): Promise<void> {
  const del = delegate as SubtablaDelegate;
  if (todoNulo(data)) {
    await del.deleteMany({ where: { idConsignatario } });
    return;
  }
  await del.upsert({
    where: { idConsignatario },
    create: { ...data, idConsignatario },
    update: data,
  });
}
