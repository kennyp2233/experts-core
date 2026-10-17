import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { CODIGOS_AGENCIA, r2, resumirLiquidacion, ValoresLiquidacion } from '../calculos/liquidacion';

const lineas = (t: string | null | undefined) =>
  (t ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/** "OCT-13-2026", como lo imprime el sistema viejo. */
const fechaAwb = (d: Date) =>
  `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()}-${String(d.getUTCDate()).padStart(2, '0')}-${d.getUTCFullYear()}`;

/** Tramos to/by de la ruta (DESTINOn / VIAn de PIN_dDocRuta), sin los vacíos. */
const tramosDe = (rutas: Array<{ tipoRuta: string; codigo: string | null }>) =>
  [1, 2, 3]
    .map((n) => ({
      hasta: rutas.find((r) => r.tipoRuta === `DESTINO${n}`)?.codigo ?? null,
      por: rutas.find((r) => r.tipoRuta === `VIA${n}`)?.codigo ?? null,
    }))
    .filter((t) => t.hasta || t.por);

/** Vuelo del primer tramo (fila VIA1 de la ruta). */
const vueloDe = (rutas: Array<{ tipoRuta: string; vuelo: string | null }>) =>
  rutas.find((r) => r.tipoRuta === 'VIA1')?.vuelo?.trim() || null;

/** "369-1176 3846" a partir de "369-11763846", "36911763846" o ya formateado. */
const formatoAwb = (n: string) => {
  const d = n.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)} ${d.slice(7)}` : n.trim();
};

/** Fulls como los escribe Access en la lista de fincas ("1,50"). */
const fullsTexto = (n: number) => n.toFixed(2).replace('.', ',');

export interface GuiaHijaImpresion {
  numero: string;
  finca: { nombre: string; ruc: string | null; direccion: string[]; telefono: string | null; ciudad: string | null; pais: string | null };
  /** Consignee de la guía hija (ConsignatarioGuiaH de su marca). */
  consignee: string[];
  dae: string | null;
  piezas: number;
  kg: number;
  fulls: number;
  productos: string[];
}

export interface ImpresionGuiasHijas {
  mawb: string | null;
  fecha: string;
  empresa: { nombre: string; ruc: string; direccion: string; ciudad: string; pais: string; telefono: string };
  origen: { codigo: string; aeropuerto: string };
  destino: { codigo: string | null; aeropuerto: string | null };
  tramos: Array<{ hasta: string | null; por: string | null }>;
  aerolinea: string | null;
  /** Vuelo del primer tramo (VIA1), si se conoce. */
  vuelo: string | null;
  pago: 'PP' | 'CC';
  consignee: string[];
  /** Consignee de la guía madre (ConsignatarioGuiaM), para el manifiesto. */
  consigneeMaster: string[];
  notify: string[];
  tipoEmbarque: string | null;
  manifiesto: string | null;
  guias: GuiaHijaImpresion[];
}

export type ValoresGuiaMadre = 'aerolinea' | 'cliente';

/** Tipos de concepto de aerolínea (ConceptoCosto.tipo) que se imprimen como "otros cargos". */
type TipoCargoAerolinea = 'COSTO_GUIA' | 'COMBUSTIBLE' | 'SEGURIDAD' | 'OTROS' | 'AUX1' | 'AUX2' | 'AUX_CALCULO';

export interface ImpresionGuiaMadre {
  /** "369-1176 3846" */
  numero: string;
  /** MID(1,3) del viejo: "369" */
  prefijo: string;
  /** MID(4,10) del viejo: "-1176 3846" */
  resto: string;
  estado: 'BORRADOR' | 'CORTADO' | 'ANULADO';
  /** Juego de valores impreso: el de la aerolínea (NORMAL) o el del cliente (CORTE_EXTRA). */
  valores: ValoresGuiaMadre;
  hayCobroCliente: boolean;
  aerolinea: {
    nombre: string;
    ruc: string | null;
    direccion: string[];
    alias: string | null;
    codigo: string | null;
    /** AerolineasPlantilla.plantillaGuiaMadre ("GMATLAS VIRTUAL"): clave del perfil de impresión. */
    plantilla: string | null;
    virtual: boolean;
  };
  /** 5 renglones fijos como el viejo: nombre, RUC, dirección, "PHONE: …", "ciudad país" ('' si falta). */
  shipper: string[];
  consignee: string[];
  notify: string[];
  /** Renglones: "nombre RUC", dirección, "ciudad país". */
  agente: { lineas: string[]; iata: string | null };
  origen: { codigo: string; aeropuerto: string };
  destino: { codigo: string | null; aeropuerto: string | null };
  tramos: Array<{ hasta: string | null; por: string | null }>;
  /** Nombre de la aerolínea del primer tramo ("By first carrier"). */
  primerTransportista: string | null;
  /** "UIO/AMS//" */
  ruta: string;
  vuelo: string | null;
  pago: 'PP' | 'CC';
  piezas: number;
  kg: number;
  fulls: number;
  pesoCobrable: number | null;
  tarifa: number | null;
  /** round2(peso cobrable × tarifa) */
  flete: number | null;
  /** Naturaleza de la carga (TipoEmbarque.descripcionGuia, un renglón por línea). */
  naturaleza: string[];
  /** Encabezado de la lista de fincas (alias de la marca), como "Impresión Fincas" del viejo. */
  marca: string | null;
  /** Fulls por finca de toda la guía, ordenadas por alias: "1,50=ALTAS CUMBRES". */
  fincas: Array<{ texto: string; nombre: string; fulls: number }>;
  /** Cargos de aerolínea distintos de 0 con el rótulo de la aerolínea (AWC, FSC, SEC…). */
  cargosAerolinea: Array<{ tipo: TipoCargoAerolinea; codigo: string; valor: number }>;
  iva: { codigo: string; valor: number };
  /** Σ códigos de agencia (extHandling). */
  handling: number;
  /** Códigos de agencia distintos de 0 (rótulos PARAMETROS.CODAGE0..6). */
  cargosAgencia: Array<{ codigo: string; valor: number }>;
  totales: { flete: number | null; dueCarrier: number; dueAgent: number; iva: number; total: number | null };
  /** Fecha de despacho (= fechaVuelo, extFechaDespacho en Access) como "OCT-13-2026". */
  fecha: string;
  lugar: string;
  empresa: { nombre: string; ruc: string };
  manifiesto: string | null;
}

/** Rótulos por defecto si la aerolínea no tiene el concepto configurado (los del viejo: aerCod1..8). */
const ROTULO_DEFECTO: Record<TipoCargoAerolinea | 'IVA', string> = {
  COSTO_GUIA: 'AWC',
  COMBUSTIBLE: 'MYC',
  SEGURIDAD: 'SSC',
  IVA: 'TAX',
  OTROS: 'OTROS',
  AUX1: 'AUX1',
  AUX2: 'AUX2',
  AUX_CALCULO: 'AUX3',
};

/** Concepto de aerolínea → campo de la liquidación (mismo mapa que coordinar.service). */
const CARGOS_AEROLINEA: ReadonlyArray<[TipoCargoAerolinea, keyof ValoresLiquidacion]> = [
  ['COSTO_GUIA', 'guiaAerea'],
  ['COMBUSTIBLE', 'combustible'],
  ['SEGURIDAD', 'seguridad'],
  ['OTROS', 'otros'],
  ['AUX1', 'aux1'],
  ['AUX2', 'aux2'],
  ['AUX_CALCULO', 'calAux'],
];

/**
 * Datos para imprimir las guías hijas por finca, como "Guías Hija por Finca"
 * del sistema viejo (repCoordina2.rpt): una House Air Waybill por guía hija,
 * en hoja blanca, con la finca como shipper, el consignatario y el notify de
 * la guía hija de la marca, Experts como agente emisor y "AS AGREED".
 *
 * Y la guía madre, como "Guía Madre" del viejo (Proc_732F70 llenando la
 * plantilla GM*.xlt de la aerolínea): todo ya formateado para imprimir.
 */
@Injectable()
export class ImpresionService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  private async empresa() {
    const params = await this.maestros.parametro.findMany({ where: { clave: { startsWith: 'EMPRESA.' } } });
    const p = (k: string) => params.find((x) => x.clave === `EMPRESA.${k}`)?.valorTexto?.trim() ?? '';
    return {
      nombre: p('empNombre') || 'EXPERTS HANDLING CARGO S.A.',
      ruc: p('empRUC'),
      direccion: p('empDireccion'),
      ciudad: p('empCiudad'),
      pais: p('empPais') || 'ECUADOR',
      telefono: p('empFono'),
    };
  }

  async guiasHijas(id: number, idGuiaHija?: number): Promise<ImpresionGuiasHijas> {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: {
        rutas: { orderBy: { orden: 'asc' } },
        manifiesto: true,
        guiaHijas: {
          where: idGuiaHija ? { id: idGuiaHija } : undefined,
          orderBy: { secuencial: 'asc' },
          include: { detalles: true },
        },
      },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    if (c.guiaHijas.length === 0) throw new NotFoundException('La coordinación no tiene guías hijas.');

    const codigoOrigen = c.rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo || 'UIO';
    const idsConsignatario = [c.idConsignatario, ...c.guiaHijas.map((g) => g.idConsignatario)].filter((x): x is number => x !== null);
    const [empresa, origen, destino, aerolinea, consH, consM, fincas, productos, embarque] = await Promise.all([
      this.empresa(),
      this.maestros.origen.findUnique({ where: { codigo: codigoOrigen } }),
      c.idDestinoAwb ? this.maestros.destino.findUnique({ where: { id: c.idDestinoAwb } }) : null,
      c.idAerolinea ? this.maestros.aerolinea.findUnique({ where: { id: c.idAerolinea } }) : null,
      this.maestros.consignatarioGuiaH.findMany({ where: { idConsignatario: { in: [...new Set(idsConsignatario)] } } }),
      c.idConsignatario ? this.maestros.consignatarioGuiaM.findUnique({ where: { idConsignatario: c.idConsignatario } }) : null,
      this.maestros.finca.findMany({
        where: { id: { in: c.guiaHijas.map((g) => g.idFinca).filter((x): x is number => x !== null) } },
      }),
      this.maestros.producto.findMany({
        where: { id: { in: c.guiaHijas.flatMap((g) => g.detalles.map((d) => d.idProducto)).filter((x): x is number => x !== null) } },
      }),
      c.idTipoEmbarque ? this.maestros.tipoEmbarque.findUnique({ where: { id: c.idTipoEmbarque } }) : null,
    ]);
    const fincaDe = new Map(fincas.map((f) => [f.id, f]));
    const productoDe = new Map(productos.map((x) => [x.id, x]));
    const consHDe = new Map(consH.map((x) => [x.idConsignatario, x]));
    const consigneeCoordinacion = lineas(c.idConsignatario ? consHDe.get(c.idConsignatario)?.guiaHNameAdress : null);
    const m = c.manifiesto;

    return {
      mawb: c.numeroGuia,
      fecha: fechaAwb(c.fechaVuelo),
      empresa,
      origen: { codigo: codigoOrigen, aeropuerto: origen?.aeropuerto || origen?.nombre || codigoOrigen },
      destino: { codigo: destino?.codigo ?? null, aeropuerto: destino?.aeropuerto || destino?.nombre || null },
      tramos: tramosDe(c.rutas),
      aerolinea: aerolinea ? aerolinea.alias?.trim() || aerolinea.nombre : null,
      vuelo: vueloDe(c.rutas),
      pago: c.pago === 'COLLECT' ? 'CC' : 'PP',
      consignee: consigneeCoordinacion,
      consigneeMaster: lineas(consM?.guiaMNameAddress),
      notify: lineas(c.idConsignatario ? consHDe.get(c.idConsignatario)?.guiaHNotify : null),
      tipoEmbarque: embarque?.nombre ?? null,
      manifiesto: m?.referencia ?? null,
      guias: c.guiaHijas.map((g) => {
        const f = g.idFinca !== null ? fincaDe.get(g.idFinca) : undefined;
        const nombres = [
          ...new Set(
            g.detalles.map((d) => d.codigoProducto ?? (d.idProducto ? productoDe.get(d.idProducto)?.nombre : null)).filter(Boolean) as string[],
          ),
        ];
        const consigneeGuia = g.idConsignatario !== null ? lineas(consHDe.get(g.idConsignatario)?.guiaHNameAdress) : [];
        return {
          numero: g.numeroGuiaHija,
          finca: {
            nombre: f?.nombreFinca ?? '',
            ruc: f?.rucFinca ?? null,
            direccion: lineas(f?.direccion),
            telefono: f?.iGeneralTelefono ?? null,
            ciudad: f?.iGeneralCiudad ?? null,
            pais: f?.iGeneralPais ?? null,
          },
          consignee: consigneeGuia.length ? consigneeGuia : consigneeCoordinacion,
          dae: g.dae ?? g.detalles.find((d) => d.dae)?.dae ?? null,
          piezas: g.detalles.reduce((s, d) => s + d.cantidadCajas, 0),
          kg: g.detalles.reduce((s, d) => s + (d.pesoKg ?? 0), 0),
          fulls: g.detalles.reduce((s, d) => s + (d.fulls ?? 0), 0),
          productos: nombres,
        };
      }),
    };
  }

  /**
   * Guía madre lista para imprimir. `valores = 'cliente'` usa el juego del
   * corte extra (lo que se le cobra al cliente) si existe; si no, el NORMAL
   * (lo que cobra la aerolínea). Se puede imprimir antes del corte ("Pre-Corte
   * de AWB" del viejo) y después.
   */
  async guiaMadre(id: number, valores: ValoresGuiaMadre = 'aerolinea'): Promise<ImpresionGuiaMadre> {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: {
        guiaMadre: { select: { numero: true } },
        rutas: { orderBy: { orden: 'asc' } },
        liquidaciones: true,
        manifiesto: true,
        guiaHijas: { select: { idFinca: true, detalles: { select: { fulls: true, cantidadCajas: true, pesoKg: true } } } },
      },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');

    const codigoOrigen = c.rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo || 'UIO';
    const tramos = tramosDe(c.rutas);
    const idsFinca = [...new Set(c.guiaHijas.map((g) => g.idFinca).filter((x): x is number => x !== null))];
    const [empresa, codigosAgencia, origen, destino, aerolinea, plantilla, consignatario, agencia, embarque, fincas] = await Promise.all([
      this.empresa(),
      this.maestros.parametro.findMany({ where: { clave: { startsWith: 'PARAMETROS.CODAGE' } } }),
      this.maestros.origen.findUnique({ where: { codigo: codigoOrigen } }),
      c.idDestinoAwb ? this.maestros.destino.findUnique({ where: { id: c.idDestinoAwb } }) : null,
      c.idAerolinea ? this.maestros.aerolinea.findUnique({ where: { id: c.idAerolinea } }) : null,
      c.idAerolinea
        ? this.maestros.aerolineasPlantilla.findUnique({ where: { idAerolinea: c.idAerolinea }, include: { conceptos: true } })
        : null,
      c.idConsignatario
        ? this.maestros.consignatario.findUnique({ where: { id: c.idConsignatario }, include: { embarcador: true, guiaM: true } })
        : null,
      c.idAgenciaIata ? this.maestros.agenciaIata.findUnique({ where: { id: c.idAgenciaIata } }) : null,
      c.idTipoEmbarque ? this.maestros.tipoEmbarque.findUnique({ where: { id: c.idTipoEmbarque } }) : null,
      this.maestros.finca.findMany({ where: { id: { in: idsFinca } }, select: { id: true, tag: true, nombreFinca: true } }),
    ]);

    // "By first carrier": el viejo busca la aerolínea por el código del primer tramo (aerPaisSigla = by1).
    const by1 = tramos[0]?.por ?? null;
    const primerTransportista =
      by1 && by1 !== aerolinea?.codigo
        ? ((await this.maestros.aerolinea.findFirst({ where: { codigo: by1 }, orderBy: { estado: 'desc' } }))?.nombre ?? aerolinea?.nombre ?? null)
        : (aerolinea?.nombre ?? null);

    // Juego de valores: NORMAL = aerolínea; CORTE_EXTRA = cliente (solo si la coordinación tiene cobro al cliente).
    const extra = c.corteExtra ? c.liquidaciones.find((l) => l.tipo === 'CORTE_EXTRA') : undefined;
    const usar: ValoresGuiaMadre = valores === 'cliente' && extra ? 'cliente' : 'aerolinea';
    const liq = usar === 'cliente' ? extra : c.liquidaciones.find((l) => l.tipo === 'NORMAL');
    const v: ValoresLiquidacion = liq ?? {
      pesoCobrable: c.liqPesoCobrable,
      tarifa: c.liqTarifa,
      guiaAerea: null,
      combustible: null,
      seguridad: null,
      otros: null,
      iva: null,
      handling: null,
      cargoAwa: null,
      cargoCha: null,
      cargoPca: null,
      cargoTax: null,
      cargoMma: null,
      cargoHawb: null,
      cargoFitos: null,
      aux1: null,
      aux2: null,
      aux3Handling: null,
      calAux: null,
      auxOtros: null,
      tarifaAcordada: null,
    };
    const resumen = resumirLiquidacion(v);

    const rotulo = (tipo: TipoCargoAerolinea | 'IVA') =>
      plantilla?.conceptos.find((x) => x.tipo === tipo)?.abreviatura?.trim().toUpperCase() || ROTULO_DEFECTO[tipo];
    const rotuloAgencia = new Map(codigosAgencia.map((x) => [x.clave, x.valorTexto?.trim()]));

    // Fulls por finca de toda la guía (tv_GuiaDetallePlantaciones del viejo), alias de la finca o su nombre.
    const fincaDe = new Map(fincas.map((f) => [f.id, f]));
    const fullsPorFinca = new Map<number, number>();
    for (const g of c.guiaHijas) {
      if (g.idFinca === null) continue;
      fullsPorFinca.set(g.idFinca, (fullsPorFinca.get(g.idFinca) ?? 0) + g.detalles.reduce((s, d) => s + (d.fulls ?? 0), 0));
    }
    const listaFincas = [...fullsPorFinca]
      .map(([idFinca, fulls]) => {
        const f = fincaDe.get(idFinca);
        const nombre = (f?.tag?.trim() || f?.nombreFinca?.trim() || `FINCA ${idFinca}`).toUpperCase();
        return { nombre, fulls: r2(fulls), texto: `${fullsTexto(fulls)}=${nombre}` };
      })
      .filter((f) => f.fulls > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const suma = (f: (d: { fulls: number | null; cantidadCajas: number; pesoKg: number | null }) => number) =>
      c.guiaHijas.reduce((s, g) => s + g.detalles.reduce((t, d) => t + f(d), 0), 0);

    // Shipper = el cliente de la marca (Embarcador); si no hay, el shipper de la agencia IATA.
    const e = consignatario?.embarcador;
    const ruc = (x: string | null | undefined) => (x?.trim() ? (/^\d+$/.test(x.trim()) ? `RUC ${x.trim()}` : x.trim()) : '');
    const shipper = e
      ? [e.nombre.trim(), ruc(e.ci), lineas(e.direccion).join(' '), e.telefono ? `PHONE: ${e.telefono.trim()}` : '', [e.ciudad, e.pais].filter(Boolean).join(' ')]
      : agencia
        ? [
            agencia.nombreShipper.trim(),
            ruc(agencia.rucShipper),
            lineas(agencia.direccionShipper).join(' '),
            agencia.telefonoShipper ? `PHONE: ${agencia.telefonoShipper.trim()}` : '',
            [agencia.ciudadShipper, agencia.paisShipper].filter(Boolean).join(' '),
          ]
        : ['', '', '', '', ''];

    const guiaM = consignatario?.guiaM;
    const consignee = lineas(guiaM?.guiaMNameAddress);
    const numero = formatoAwb(c.numeroGuia ?? c.guiaMadre.numero ?? '');
    const to = (i: number) => tramos[i]?.hasta ?? '';

    return {
      numero,
      prefijo: numero.slice(0, 3),
      resto: numero.slice(3, 13),
      estado: c.estadoActual,
      valores: usar,
      hayCobroCliente: !!extra,
      aerolinea: {
        nombre: aerolinea?.nombre ?? '',
        ruc: aerolinea?.ciRuc ?? null,
        direccion: lineas(aerolinea?.direccion),
        alias: aerolinea?.alias ?? null,
        codigo: aerolinea?.codigo ?? null,
        plantilla: plantilla?.plantillaGuiaMadre?.trim() || c.plantillaGuiaMadre?.trim() || null,
        virtual: aerolinea?.guiasVirtuales ?? false,
      },
      shipper,
      consignee: consignee.length
        ? consignee
        : consignatario
          ? [consignatario.nombre, ...lineas(consignatario.direccion), [consignatario.ciudad, consignatario.pais].filter(Boolean).join(' ')].filter(Boolean)
          : [],
      notify: lineas(guiaM?.guiaMNotify),
      agente: agencia
        ? {
            lineas: [
              [agencia.nombreCarrier ?? agencia.nombreShipper, agencia.rucCarrier].filter(Boolean).join(' ').trim(),
              lineas(agencia.direccionCarrier).join(' '),
              [agencia.ciudadCarrier, agencia.paisCarrier].filter(Boolean).join(' '),
            ],
            iata: agencia.iataCodeCarrier?.trim() || null,
          }
        : { lineas: [], iata: null },
      origen: { codigo: codigoOrigen, aeropuerto: origen?.aeropuerto || origen?.nombre || codigoOrigen },
      destino: { codigo: destino?.codigo ?? null, aeropuerto: destino?.aeropuerto || destino?.nombre || null },
      tramos,
      primerTransportista,
      ruta: `${codigoOrigen}/${to(0)}/${to(1)}/${to(2)}`,
      vuelo: vueloDe(c.rutas),
      pago: c.pago === 'COLLECT' ? 'CC' : 'PP',
      piezas: c.totalCajas ?? suma((d) => d.cantidadCajas),
      kg: c.totalKgs ?? r2(suma((d) => d.pesoKg ?? 0)),
      fulls: c.totalFulls ?? r2(suma((d) => d.fulls ?? 0)),
      pesoCobrable: resumen.pesoCobrable,
      tarifa: resumen.tarifa,
      flete: resumen.flete,
      naturaleza: embarque ? (lineas(embarque.descripcionGuia).length ? lineas(embarque.descripcionGuia) : [embarque.nombre]) : [],
      marca: consignatario ? consignatario.alias?.trim() || consignatario.nombre : null,
      fincas: listaFincas,
      cargosAerolinea: CARGOS_AEROLINEA.map(([tipo, campo]) => ({ tipo, codigo: rotulo(tipo), valor: r2(Number(v[campo] ?? 0)) })).filter(
        (x) => x.valor !== 0,
      ),
      iva: { codigo: rotulo('IVA'), valor: resumen.iva },
      handling: resumen.dueAgent,
      cargosAgencia: CODIGOS_AGENCIA.map((campo, i) => ({
        codigo: (rotuloAgencia.get(`PARAMETROS.CODAGE${i}`) || campo.replace('cargo', '')).toUpperCase(),
        valor: r2(v[campo] ?? 0),
      })).filter((x) => x.valor !== 0),
      totales: {
        flete: resumen.flete,
        dueCarrier: resumen.dueCarrier,
        dueAgent: resumen.dueAgent,
        iva: resumen.iva,
        total: resumen.total,
      },
      fecha: fechaAwb(c.fechaVuelo),
      lugar: `${(origen?.nombre || 'QUITO').trim().toUpperCase()} - ${empresa.pais.toUpperCase()}`,
      empresa: { nombre: empresa.nombre, ruc: empresa.ruc },
      manifiesto: c.manifiesto?.referencia ?? null,
    };
  }
}
