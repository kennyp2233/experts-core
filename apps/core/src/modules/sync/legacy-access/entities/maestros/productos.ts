import { idDe } from '../../engine/sync-engine';
import { activoPin, agrupar, flag, int, num, numSin0, txt } from '../../engine/normalize';
import { AccessRow, EntidadSync } from '../../engine/sync.types';

/** PIN_auxUnidades → Medida (STEMS, …). */
export const medida: EntidadSync = {
  entidad: 'medida',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT uniCodigo, uniNombre, uniImpresion, uniEstado FROM PIN_auxUnidades',
    ),
  clave: (r) => txt(r.uniCodigo),
  mapear: (r) => {
    const nombre = txt(r.uniNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    return {
      codigoAccess: int(r.uniCodigo),
      nombre,
      impresion: txt(r.uniImpresion),
      estado: activoPin(r.uniEstado),
    };
  },
  guardar: async (db, d: any) =>
    (
      await db.medida.upsert({
        where: { codigoAccess: d.codigoAccess },
        create: d,
        update: d,
        select: { id: true },
      })
    ).id,
  desactivar: async (db, id) => {
    await db.medida.updateMany({ where: { id }, data: { estado: false } });
  },
};

interface ProductoRow extends AccessRow {
  _aranceles: AccessRow[];
  _decAdi: AccessRow[];
  _mipro: AccessRow[];
}

const porTexto = (k: (r: AccessRow) => unknown) => (a: AccessRow, b: AccessRow) =>
  String(k(a) ?? '').localeCompare(String(k(b) ?? ''));

/**
 * PIN_MProductos → Producto, con sus hijos:
 *  - PIN_DProCodAso (partida arancelaria por destino) → ProductosAranceles
 *  - PIN_DProDecAdi (declaración adicional por país)  → ProductosCompuesto
 *  - mipro_producto_arancel (certificados MiPro)      → ProductosMiPro
 * Los hijos se reemplazan completos cuando cambia algo del producto.
 */
export const producto: EntidadSync<ProductoRow> = {
  entidad: 'producto',
  leer: async (ctx) => {
    // Secuencial a propósito: Access lleva mal la concurrencia.
    const prods = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT proCodigo, proNombre, proRefer, proDescripcion, proNomBot, proNomBotEx, proUnidad, proPrecio, proEstado, proTipo, proStems, proID FROM PIN_MProductos',
    );
    const aranceles = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT a.proCodigo, a.desCodigo, a.proCodAso, o.desNombre FROM PIN_DProCodAso AS a LEFT JOIN PIN_auxOtrDes AS o ON a.desCodigo = o.desCodigo',
    );
    const decAdi = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT proCodigo, paiCodigo, decID FROM PIN_DProDecAdi',
    );
    const mipro = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT m.proCodigo, m.idCertificado, m.DJOCode, m.TariffCode, t.Alias FROM mipro_producto_arancel AS m LEFT JOIN mipro_tipos_certificado AS t ON m.idCertificado = t.ID',
    );
    const ar = agrupar(aranceles, (r) => txt(r.proCodigo));
    const da = agrupar(decAdi, (r) => txt(r.proCodigo));
    const mp = agrupar(mipro, (r) => txt(r.proCodigo));
    return prods.map((p) => {
      const k = txt(p.proCodigo) ?? '';
      return {
        ...p,
        _aranceles: (ar.get(k) ?? []).sort(porTexto((r) => `${r.desCodigo}|${r.proCodAso}`)),
        _decAdi: (da.get(k) ?? []).sort(porTexto((r) => `${r.paiCodigo}|${r.decID}`)),
        _mipro: (mp.get(k) ?? []).sort(porTexto((r) => `${r.idCertificado}|${r.TariffCode}`)),
      };
    });
  },
  clave: (r) => txt(r.proCodigo),
  mapear: (r, ctx) => {
    const codigo = txt(r.proCodigo)!;
    const medidaId = idDe(ctx, 'medida', r.proUnidad);
    if (medidaId === null) return { omitir: `la unidad ${txt(r.proUnidad)} no existe` };
    const decId = (v: unknown) => int(v);
    return {
      codigo,
      nombre: txt(r.proNombre) ?? codigo,
      descripcion: txt(r.proDescripcion),
      referencia: txt(r.proRefer),
      nombreBotanico: txt(r.proNomBot),
      especie: txt(r.proNomBotEx),
      medidaId,
      precioUnitario: num(r.proPrecio),
      estado: activoPin(r.proEstado),
      opcionId: flag(r.proTipo) ? ('compuesto' as const) : ('simple' as const),
      stemsPorFull: int(numSin0(r.proStems)),
      sesaId: int(numSin0(r.proID)),
      aranceles: r._aranceles.map((a) => ({
        arancelesCodigo: txt(a.proCodAso),
        arancelesDestino: txt(a.desNombre),
        idOtroDestino: idDe(ctx, 'otroDestino', a.desCodigo),
      })),
      compuestos: r._decAdi.map((d) => ({
        destino: txt(d.paiCodigo),
        declaracion: decId(d.decID) === null ? null : String(decId(d.decID)),
      })),
      mipro: r._mipro.map((m) => ({
        acuerdo: txt(m.Alias),
        idAcuerdo: idDe(ctx, 'acuerdoArancelario', m.idCertificado),
        djoCode: txt(m.DJOCode),
        tariffCode: txt(m.TariffCode),
      })),
    };
  },
  guardar: async (db, d: any) => {
    const { aranceles, compuestos, mipro, ...base } = d;
    const { id } = await db.producto.upsert({
      where: { codigo: base.codigo },
      create: base,
      update: base,
      select: { id: true },
    });
    await db.productosAranceles.deleteMany({ where: { productId: id } });
    await db.productosCompuesto.deleteMany({ where: { productId: id } });
    await db.productosMiPro.deleteMany({ where: { productId: id } });
    if (aranceles.length > 0) {
      await db.productosAranceles.createMany({
        data: aranceles.map((a: object) => ({ ...a, productId: id })),
      });
    }
    if (compuestos.length > 0) {
      await db.productosCompuesto.createMany({
        data: compuestos.map((c: object) => ({ ...c, productId: id })),
      });
    }
    if (mipro.length > 0) {
      await db.productosMiPro.createMany({
        data: mipro.map((m: object) => ({ ...m, productId: id })),
      });
    }
    return id;
  },
  desactivar: async (db, id) => {
    await db.producto.updateMany({ where: { id }, data: { estado: false } });
  },
};

interface GrupoRow {
  clave: string;
  items: AccessRow[];
}

/** PIN_dProComp → ProductoComponente (composición de los productos compuestos). */
export const productoComponente: EntidadSync<GrupoRow> = {
  entidad: 'productoComponente',
  leer: async (ctx) => {
    const rows = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT proCodigo, detNumero, proCodComp, detStems FROM PIN_dProComp',
    );
    return [...agrupar(rows, (r) => txt(r.proCodigo)).entries()].map(([clave, items]) => ({
      clave,
      items: items.sort((a, b) => (int(a.detNumero) ?? 0) - (int(b.detNumero) ?? 0)),
    }));
  },
  clave: (g) => g.clave,
  mapear: (g, ctx) => {
    const productId = idDe(ctx, 'producto', g.clave);
    if (productId === null) return { omitir: 'el producto no está sincronizado' };
    const faltan = g.items.filter((i) => idDe(ctx, 'producto', i.proCodComp) === null);
    if (faltan.length > 0) {
      return { omitir: `componentes sin sincronizar: ${faltan.map((i) => txt(i.proCodComp)).join(', ')}` };
    }
    return {
      productId,
      items: g.items.map((i) => ({
        componenteId: idDe(ctx, 'producto', i.proCodComp)!,
        orden: int(i.detNumero) ?? 0,
        stems: int(numSin0(i.detStems)),
      })),
    };
  },
  guardar: async (db, d: any) => {
    await db.productoComponente.deleteMany({ where: { productId: d.productId } });
    await db.productoComponente.createMany({
      data: d.items.map((i: object) => ({ ...i, productId: d.productId })),
    });
    return d.productId;
  },
  desactivar: async (db, productId) => {
    await db.productoComponente.deleteMany({ where: { productId } });
  },
};
