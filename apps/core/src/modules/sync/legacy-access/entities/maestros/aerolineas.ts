import { idDe } from '../../engine/sync-engine';
import { activoPin, flag, int, multilinea, num, parte, txt } from '../../engine/normalize';
import { AccessRow, EntidadSync } from '../../engine/sync.types';

/**
 * Posición de cada código de costo de PIN_auxAerolineas (aerCod1..8) →
 * TipoConcepto. Inferido de la pantalla de aerolíneas del sistema viejo
 * (Costo Guía, Combustible, Seguridad, IVA, Otros, Aux1, Aux2, cálculo
 * auxiliar) y de qué columnas tienen valor (`Val`) y factor por peso (`Peso`).
 */
const CONCEPTOS: ReadonlyArray<{
  n: number;
  tipo: 'COSTO_GUIA' | 'COMBUSTIBLE' | 'SEGURIDAD' | 'IVA' | 'OTROS' | 'AUX1' | 'AUX2' | 'AUX_CALCULO';
  val: string | null;
  peso: string | null;
}> = [
  { n: 1, tipo: 'COSTO_GUIA', val: 'aerCod1Val', peso: null },
  { n: 2, tipo: 'COMBUSTIBLE', val: 'aerCod2Val', peso: 'aerCod2Peso' },
  { n: 3, tipo: 'SEGURIDAD', val: 'aerCod3Val', peso: 'aerCod3Peso' },
  { n: 4, tipo: 'IVA', val: null, peso: null },
  { n: 5, tipo: 'OTROS', val: 'aerCod5Val', peso: null },
  { n: 6, tipo: 'AUX1', val: 'aerCod6Val', peso: null },
  { n: 7, tipo: 'AUX2', val: 'aerCod7Val', peso: null },
  { n: 8, tipo: 'AUX_CALCULO', val: 'aerCod8Val', peso: 'aerCod8Peso' },
];

/** PIN_auxAerolineas → Aerolinea + AerolineasPlantilla + ConceptoCosto. */
export const aerolinea: EntidadSync = {
  entidad: 'aerolinea',
  leer: (ctx) =>
    ctx.legacy.queryBridge(
      'SELECT aerCodigo, aerRUC, aerNombre, aerAlias, aerDireccion, aerFono, aerEmail, aerCiudad, aerPais, aerPaisSigla, aerLeyenda, aerCod1, aerCod2, aerCod3, aerCod4, aerCod5, aerCod6, aerCod7, aerCod8, aerCod1Val, aerCod2Val, aerCod3Val, aerCod5Val, aerCod6Val, aerCod7Val, aerCod8Val, aerCod2Peso, aerCod3Peso, aerCod8Peso, aerRate, aerPCA, aerPlantilla, aerPlantillaReservas, aerEstado, aerHAWB, aerRecipient, aerRecipientDisplayName, aerSubject, aerCASS, aerPrefix, aerVirtual, aerModo, aerCAE, aerContacto FROM PIN_auxAerolineas',
    ),
  clave: (r) => txt(r.aerCodigo),
  mapear: (r) => {
    const nombre = txt(r.aerNombre);
    if (!nombre) return { omitir: 'sin nombre' };
    const modo = int(r.aerModo);
    const conceptos = CONCEPTOS.map((c) => ({
      tipo: c.tipo,
      abreviatura: txt(r[`aerCod${c.n}`]),
      valor: (c.val ? num(r[c.val]) : null) ?? 0,
      // Los conceptos con columna Peso siempre son por kg: aerCodNPeso = 1 → sobre
      // peso cobrable, 0 → sobre peso bruto (legacy-analysis/reglas/liquidacion.md R13).
      multiplicador: c.peso
        ? flag(r[c.peso])
          ? ('CHARGEABLE_WEIGHT' as const)
          : ('GROSS_WEIGHT' as const)
        : null,
    })).filter((c) => c.abreviatura !== null || c.valor !== 0);
    return {
      base: {
        codigoAccess: int(r.aerCodigo),
        nombre,
        alias: txt(r.aerAlias),
        ciRuc: txt(r.aerRUC),
        direccion: multilinea(r.aerDireccion),
        telefono: txt(r.aerFono),
        email: txt(r.aerEmail),
        ciudad: txt(r.aerCiudad),
        pais: txt(r.aerPais),
        contacto: txt(r.aerContacto),
        // Combo del sistema viejo: 0 = "En FULL'S", 1 = "En PIEZAS".
        modo: modo === null ? null : modo === 0 ? ('EN_FULLES' as const) : ('EN_PIEZAS' as const),
        maestraGuiasHijas: flag(r.aerHAWB),
        // aerPaisSigla guarda en realidad el código IATA de 2 letras (ej. "5Y").
        codigo: txt(r.aerPaisSigla),
        prefijoAwb: txt(r.aerPrefix),
        codigoCae: txt(r.aerCAE),
        leyenda: txt(r.aerLeyenda),
        reservasDestinatarios: txt(r.aerRecipient),
        reservasNombreContacto: txt(r.aerRecipientDisplayName),
        reservasAsunto: txt(r.aerSubject),
        estado: activoPin(r.aerEstado),
        afiliadoCass: flag(r.aerCASS),
        guiasVirtuales: flag(r.aerVirtual),
      },
      plantilla: {
        plantillaGuiaMadre: parte(r.aerPlantilla, 0),
        plantillaFormatoAerolinea: parte(r.aerPlantilla, 1),
        plantillaReservas: txt(r.aerPlantillaReservas),
        tarifaRate: num(r.aerRate) ?? 0,
        pca: num(r.aerPCA) ?? 0,
      },
      conceptos,
    };
  },
  guardar: async (db, d: any) => {
    const { id } = await db.aerolinea.upsert({
      where: { codigoAccess: d.base.codigoAccess },
      create: d.base,
      update: d.base,
      select: { id: true },
    });
    await db.aerolineasPlantilla.upsert({
      where: { idAerolinea: id },
      create: { ...d.plantilla, idAerolinea: id },
      update: d.plantilla,
    });
    await db.conceptoCosto.deleteMany({ where: { plantillaId: id } });
    if (d.conceptos.length > 0) {
      await db.conceptoCosto.createMany({
        data: d.conceptos.map((c: object) => ({ ...c, plantillaId: id })),
      });
    }
    return id;
  },
  desactivar: async (db, id) => {
    await db.aerolinea.updateMany({ where: { id }, data: { estado: false } });
  },
};

interface RutaRow extends AccessRow {
  /** Código IATA de aerolínea → aerCodigo, para resolver las vías. */
  _porIata: Record<string, string>;
}

/** Tramos de PIN_auxAeroRuta en el orden del modelo AerolineaRuta. */
const TRAMOS = [
  { col: 'aerFrom', tipo: 'ORIGEN', ref: 'origen' },
  { col: 'aerTo', tipo: 'DESTINO1', ref: 'destino' },
  { col: 'aerBy', tipo: 'VIA1', ref: 'via' },
  { col: 'aerTo1', tipo: 'DESTINO2', ref: 'destino' },
  { col: 'aerBy1', tipo: 'VIA2', ref: 'via' },
  { col: 'aerTo2', tipo: 'DESTINO3', ref: 'destino' },
  { col: 'aerBy2', tipo: 'VIA3', ref: 'via' },
] as const;

/** PIN_auxAeroRuta (una ruta por aerolínea) → filas AerolineaRuta. */
export const aerolineaRuta: EntidadSync<RutaRow> = {
  entidad: 'aerolineaRuta',
  leer: async (ctx) => {
    const rutas = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT aerCodigo, aerFrom, aerTo, aerBy, aerTo1, aerBy1, aerTo2, aerBy2 FROM PIN_auxAeroRuta',
    );
    const aerolineas = await ctx.legacy.queryBridge<AccessRow>(
      'SELECT aerCodigo, aerPaisSigla FROM PIN_auxAerolineas ORDER BY aerCodigo',
    );
    const porIata: Record<string, string> = {};
    for (const a of aerolineas) {
      const iata = txt(a.aerPaisSigla);
      // Si hay dos aerolíneas con el mismo código IATA, gana la primera.
      if (iata && !(iata in porIata)) porIata[iata] = txt(a.aerCodigo) ?? '';
    }
    return rutas.map((r) => ({ ...r, _porIata: porIata }));
  },
  clave: (r) => txt(r.aerCodigo),
  mapear: (r, ctx) => {
    const aerolineaId = idDe(ctx, 'aerolinea', r.aerCodigo);
    if (aerolineaId === null) return { omitir: 'la aerolínea no está sincronizada' };
    const items: Array<Record<string, unknown>> = [];
    const sinResolver: string[] = [];
    TRAMOS.forEach((t, i) => {
      const codigo = txt(r[t.col]);
      if (!codigo) return;
      const id =
        t.ref === 'via'
          ? idDe(ctx, 'aerolinea', r._porIata[codigo])
          : idDe(ctx, t.ref, codigo);
      if (id === null) {
        sinResolver.push(`${t.tipo}=${codigo}`);
        return;
      }
      items.push({
        tipoRuta: t.tipo,
        orden: i + 1,
        origenId: t.ref === 'origen' ? id : null,
        destinoId: t.ref === 'destino' ? id : null,
        viaAerolineaId: t.ref === 'via' ? id : null,
      });
    });
    if (sinResolver.length > 0) {
      return { omitir: `tramos que no existen: ${sinResolver.join(', ')}` };
    }
    return { aerolineaId, items };
  },
  guardar: async (db, d: any) => {
    await db.aerolineaRuta.deleteMany({ where: { aerolineaId: d.aerolineaId } });
    if (d.items.length > 0) {
      await db.aerolineaRuta.createMany({
        data: d.items.map((i: object) => ({ ...i, aerolineaId: d.aerolineaId })),
      });
    }
    return d.aerolineaId;
  },
  desactivar: async (db, aerolineaId) => {
    await db.aerolineaRuta.deleteMany({ where: { aerolineaId } });
  },
};
