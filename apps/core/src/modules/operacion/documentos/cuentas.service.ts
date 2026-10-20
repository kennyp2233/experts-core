import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import * as XLSX from 'xlsx';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { NombresMaestrosService, ref, RefMaestro } from '../maestros/nombres-maestros.service';
import {
  CODIGOS_AGENCIA,
  CONCEPTOS_AEROLINEA,
  r2,
  resumirLiquidacion,
  ValoresLiquidacion,
} from '../calculos/liquidacion';
import { ArchivoReporte } from './reportes-dia.service';
import { ImpresionService } from './impresion.service';

type CodigoAgencia = (typeof CODIGOS_AGENCIA)[number];

/**
 * Lo que se le cobra al cliente por una guía. En el sistema viejo hay dos
 * juegos de valores (legacy-analysis/reglas/liquidacion.md): el normal (lo que
 * cobra la aerolínea, va en la guía madre) y el "corte extra" (*_ex, lo que se
 * le cobra al cliente), y además el handling de Experts (`extAux3Handling`),
 * que el viejo guarda SOLO en el juego normal. Por eso sus documentos salían
 * incompletos y se corregían a mano: el estado de cuenta usaba el corte extra
 * pero ponía el handling en 0 (y el peso cobrable del juego normal), y la
 * liquidación general, las ventas y el Shipment-Invoice usaban el juego normal.
 * Aquí el cobro al cliente sale siempre del juego vigente (corte extra si lo
 * hay) con su propio peso cobrable, y el handling va como renglón aparte.
 */
export interface CobroGuia {
  id: number;
  numero: number;
  numeroGuia: string | null;
  fechaVuelo: string;
  estado: string;
  aerolinea: RefMaestro | null;
  marca: RefMaestro | null;
  cliente: RefMaestro | null;
  destino: RefMaestro | null;
  piezas: number;
  fulls: number;
  pesoBruto: number;
  /** Juego con que se cobra: CORTE_EXTRA (cobro al cliente) o NORMAL (sin cobro distinto). */
  juego: 'CORTE_EXTRA' | 'NORMAL';
  pesoCobrable: number | null;
  tarifa: number | null;
  flete: number;
  /** Cargos de aerolínea por concepto (guía aérea, combustible, …) y su suma. */
  cargosAerolinea: Record<(typeof CONCEPTOS_AEROLINEA)[number], number>;
  dueCarrier: number;
  /** Cargos de agencia (Form A, Transport, …) por código y su suma. */
  cargosAgencia: Record<CodigoAgencia, number>;
  dueAgent: number;
  iva: number;
  /** Total de la guía al cliente (flete + cargos + IVA), como docTotal. */
  totalGuia: number;
  /** Handling de Experts al cliente (no está en el total de la guía). */
  handling: number;
  /** Total a cobrar: total de la guía + handling. */
  totalCobrar: number;
  /** Lo que cobra la aerolínea (total de la guía madre). */
  costoAerolinea: number;
  /** Total a cobrar − costo aerolínea. */
  ganancia: number;
}

export interface FiltroCuentas {
  desde?: string;
  hasta?: string;
  idCliente?: number;
  /** Portal de clientes: solo estos clientes. */
  idsCliente?: number[];
  idAerolinea?: number;
  /** Por defecto solo las cortadas (valores definitivos). */
  incluirAbiertas?: boolean;
}

const valoresDe = (l: Record<string, unknown> | undefined): ValoresLiquidacion => {
  const n = (k: string) => (typeof l?.[k] === 'number' ? (l[k] as number) : null);
  return {
    pesoCobrable: n('pesoCobrable'), tarifa: n('tarifa'), guiaAerea: n('guiaAerea'), combustible: n('combustible'),
    seguridad: n('seguridad'), otros: n('otros'), iva: n('iva'), handling: n('handling'), cargoAwa: n('cargoAwa'),
    cargoCha: n('cargoCha'), cargoPca: n('cargoPca'), cargoTax: n('cargoTax'), cargoMma: n('cargoMma'),
    cargoHawb: n('cargoHawb'), cargoFitos: n('cargoFitos'), aux1: n('aux1'), aux2: n('aux2'),
    aux3Handling: n('aux3Handling'), calAux: n('calAux'), auxOtros: n('auxOtros'), tarifaAcordada: n('tarifaAcordada'),
  };
};
const dia = (d: Date) => d.toISOString().slice(0, 10);
const fechaTexto = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const nombre = (r: RefMaestro | null) => (r ? r.alias || r.nombre : '');
const DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Estado de cuenta por cliente, ventas / liquidación y liquidación de una guía al cliente. */
@Injectable()
export class CuentasService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
    private readonly nombres: NombresMaestrosService,
    private readonly impresion: ImpresionService,
  ) {}

  /** Rótulos de los 7 códigos de agencia (_PARAMETROS CODAGE0..6), p. ej. "FORM A", "TRANSPORT". */
  async etiquetasAgencia(): Promise<Record<CodigoAgencia, string>> {
    const ps = await this.maestros.parametro.findMany({ where: { clave: { startsWith: 'PARAMETROS.CODAGE' } } });
    const p = new Map(ps.map((x) => [x.clave, x.valorTexto]));
    return Object.fromEntries(
      CODIGOS_AGENCIA.map((c, i) => [c, p.get(`PARAMETROS.CODAGE${i}`)?.trim() || c.replace('cargo', '').toUpperCase()]),
    ) as Record<CodigoAgencia, string>;
  }

  /** Cobro al cliente de cada guía que cumple el filtro, por fecha de vuelo. */
  async cobros(f: FiltroCuentas): Promise<CobroGuia[]> {
    if (f.desde && !DIA.test(f.desde)) throw new BadRequestException('Fecha "desde" inválida (AAAA-MM-DD).');
    if (f.hasta && !DIA.test(f.hasta)) throw new BadRequestException('Fecha "hasta" inválida (AAAA-MM-DD).');
    const and: Prisma.DocumentoCoordinacionWhereInput[] = [
      { estadoActual: f.incluirAbiertas ? { not: 'ANULADO' } : 'CORTADO' },
    ];
    if (f.desde) and.push({ fechaVuelo: { gte: new Date(`${f.desde}T00:00:00Z`) } });
    if (f.hasta) and.push({ fechaVuelo: { lte: new Date(`${f.hasta}T00:00:00Z`) } });
    if (f.idAerolinea) and.push({ idAerolinea: f.idAerolinea });
    const clientes = f.idsCliente ? (f.idCliente ? f.idsCliente.filter((c) => c === f.idCliente) : f.idsCliente) : f.idCliente ? [f.idCliente] : null;
    if (clientes) {
      const marcas = await this.maestros.consignatario.findMany({ where: { idCliente: { in: clientes } }, select: { id: true } });
      and.push({ idConsignatario: { in: marcas.map((m) => m.id) } });
    }
    const coords = await this.db.documentoCoordinacion.findMany({
      where: { AND: and },
      include: { liquidaciones: true },
      orderBy: [{ fechaVuelo: 'asc' }, { codigoAccess: 'asc' }, { numero: 'asc' }],
    });
    const refs = await this.nombres.resolver({
      aerolineas: coords.map((c) => c.idAerolinea),
      consignatarios: coords.map((c) => c.idConsignatario),
      destinos: coords.map((c) => c.idDestinoFinalDocs ?? c.idDestinoAwb),
    });
    return coords.map((c) => {
      const normal = c.liquidaciones.find((l) => l.tipo === 'NORMAL');
      const extra = c.corteExtra ? c.liquidaciones.find((l) => l.tipo === 'CORTE_EXTRA') : undefined;
      const vCliente = valoresDe((extra ?? normal) as Record<string, unknown> | undefined);
      const vNormal = valoresDe(normal as Record<string, unknown> | undefined);
      const res = resumirLiquidacion(vCliente);
      const costo = resumirLiquidacion(vNormal);
      // El handling al cliente vive en el juego normal (extAux3Handling); el _ex casi nunca se llena.
      const handling = r2((vCliente.aux3Handling || vNormal.aux3Handling) ?? 0);
      const totalGuia = res.total ?? 0;
      const totalCobrar = r2(totalGuia + handling);
      return {
        id: c.id,
        numero: c.codigoAccess ?? c.numero ?? c.id,
        numeroGuia: c.numeroGuia,
        fechaVuelo: dia(c.fechaVuelo),
        estado: c.estadoActual,
        aerolinea: ref(refs.aerolineas, c.idAerolinea),
        marca: ref(refs.consignatarios, c.idConsignatario),
        cliente: ref(refs.clientesPorConsignatario, c.idConsignatario),
        destino: ref(refs.destinos, c.idDestinoFinalDocs ?? c.idDestinoAwb),
        piezas: c.totalCajas ?? 0,
        fulls: c.totalFulls ?? 0,
        pesoBruto: c.totalKgs ?? 0,
        juego: extra ? 'CORTE_EXTRA' : 'NORMAL',
        pesoCobrable: res.pesoCobrable,
        tarifa: res.tarifa,
        flete: res.flete ?? 0,
        cargosAerolinea: Object.fromEntries(CONCEPTOS_AEROLINEA.map((k) => [k, r2(vCliente[k] ?? 0)])) as CobroGuia['cargosAerolinea'],
        dueCarrier: res.dueCarrier,
        cargosAgencia: Object.fromEntries(CODIGOS_AGENCIA.map((k) => [k, r2(vCliente[k] ?? 0)])) as CobroGuia['cargosAgencia'],
        dueAgent: res.dueAgent,
        iva: res.iva,
        totalGuia,
        handling,
        totalCobrar,
        costoAerolinea: costo.total ?? 0,
        ganancia: r2(totalCobrar - (costo.total ?? 0)),
      };
    });
  }

  /** Estado de cuenta de un cliente (quincena o rango): una fila por guía, total a cobrar al pie. */
  async estadoCuenta(f: FiltroCuentas & { idCliente: number }) {
    if (!f.idCliente) throw new BadRequestException('Elija el cliente.');
    if (!f.desde || !f.hasta) throw new BadRequestException('Elija el período (desde y hasta).');
    const cliente = await this.maestros.cliente.findUnique({ where: { id: f.idCliente } });
    if (!cliente) throw new NotFoundException('El cliente no existe.');
    const filas = await this.cobros(f);
    const suma = (k: keyof CobroGuia) => r2(filas.reduce((s, x) => s + ((x[k] as number) ?? 0), 0));
    return {
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        nombreFactura: cliente.nombreFactura || cliente.nombre,
        ruc: cliente.rucFactura || cliente.ruc,
        direccion: cliente.direccionFactura || cliente.direccion,
        telefono: cliente.telefonoFactura || cliente.telefono,
        ciudad: cliente.ciudad,
        pais: cliente.pais,
        email: cliente.email,
      },
      desde: f.desde,
      hasta: f.hasta,
      empresa: await this.impresion.empresa(),
      etiquetasAgencia: await this.etiquetasAgencia(),
      filas: filas.map(({ costoAerolinea: _c, ganancia: _g, ...x }) => x),
      totales: {
        guias: filas.length,
        piezas: suma('piezas'),
        fulls: suma('fulls'),
        pesoBruto: suma('pesoBruto'),
        flete: suma('flete'),
        dueCarrier: suma('dueCarrier'),
        dueAgent: suma('dueAgent'),
        iva: suma('iva'),
        totalGuia: suma('totalGuia'),
        handling: suma('handling'),
        totalCobrar: suma('totalCobrar'),
        pesoCobrable: suma('pesoCobrable'),
      },
    };
  }

  /** Ventas y liquidación: costo aerolínea vs. cobrado al cliente por guía, con resumen por aerolínea y cliente. */
  async ventas(f: FiltroCuentas) {
    if (!f.desde || !f.hasta) throw new BadRequestException('Elija el período (desde y hasta).');
    const filas = await this.cobros(f);
    const agrupar = (clave: (x: CobroGuia) => RefMaestro | null) => {
      const g = new Map<string, { nombre: string; guias: number; pesoCobrable: number; costo: number; cobrado: number; handling: number; ganancia: number }>();
      for (const x of filas) {
        const r = clave(x);
        const k = r ? String(r.id) : '-';
        const acc = g.get(k) ?? { nombre: r ? nombre(r) : '(sin dato)', guias: 0, pesoCobrable: 0, costo: 0, cobrado: 0, handling: 0, ganancia: 0 };
        acc.guias += 1;
        acc.pesoCobrable += x.pesoCobrable ?? 0;
        acc.costo = r2(acc.costo + x.costoAerolinea);
        acc.cobrado = r2(acc.cobrado + x.totalCobrar);
        acc.handling = r2(acc.handling + x.handling);
        acc.ganancia = r2(acc.ganancia + x.ganancia);
        g.set(k, acc);
      }
      return [...g.values()].sort((a, b) => b.cobrado - a.cobrado);
    };
    const suma = (k: keyof CobroGuia) => r2(filas.reduce((s, x) => s + ((x[k] as number) ?? 0), 0));
    return {
      desde: f.desde,
      hasta: f.hasta,
      etiquetasAgencia: await this.etiquetasAgencia(),
      filas,
      porAerolinea: agrupar((x) => x.aerolinea),
      porCliente: agrupar((x) => x.cliente),
      totales: {
        guias: filas.length,
        pesoCobrable: suma('pesoCobrable'),
        costoAerolinea: suma('costoAerolinea'),
        totalGuia: suma('totalGuia'),
        handling: suma('handling'),
        totalCobrar: suma('totalCobrar'),
        ganancia: suma('ganancia'),
      },
    };
  }

  /** Liquidación de una guía al cliente (reemplaza al Shipment-Invoice del viejo, que salía con los costos). */
  async liquidacionGuia(id: number, idsCliente?: number[]) {
    const c = await this.db.documentoCoordinacion.findUnique({ where: { id }, select: { id: true, estadoActual: true, fechaVuelo: true } });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    const d = dia(c.fechaVuelo);
    const [cobro] = (await this.cobros({ desde: d, hasta: d, idsCliente, incluirAbiertas: true })).filter((x) => x.id === id);
    if (!cobro) throw new NotFoundException('La coordinación no existe.');
    const marca = cobro.marca ? await this.maestros.consignatario.findUnique({ where: { id: cobro.marca.id }, include: { cliente: true } }) : null;
    const cl = marca?.cliente;
    const { costoAerolinea: _c, ganancia: _g, ...guia } = cobro;
    return {
      ...guia,
      clienteFactura: cl
        ? {
            nombre: cl.nombreFactura || cl.nombre,
            ruc: cl.rucFactura || cl.ruc,
            direccion: cl.direccionFactura || cl.direccion,
            telefono: cl.telefonoFactura || cl.telefono,
            ciudad: cl.ciudad,
            pais: cl.pais,
          }
        : null,
      empresa: await this.impresion.empresa(),
      etiquetasAgencia: await this.etiquetasAgencia(),
    };
  }

  // ---------------------------------------------------------------------------
  // Excel

  async estadoCuentaXlsx(f: FiltroCuentas & { idCliente: number }): Promise<ArchivoReporte> {
    const e = await this.estadoCuenta(f);
    const et = e.etiquetasAgencia;
    const codigos = CODIGOS_AGENCIA.filter((k) => e.filas.some((x) => x.cargosAgencia[k]));
    const cab = ['FECHA', 'GUÍA', 'MARCA', 'DESTINO', 'PIEZAS', 'FULLS', 'PESO BRUTO', 'PESO COBRABLE', 'TARIFA', 'FLETE',
      'CARGOS AEROLÍNEA', ...codigos.map((k) => et[k]), 'IVA', 'TOTAL GUÍA', 'HANDLING', 'TOTAL A PAGAR'];
    const filas = e.filas.map((x) => [fechaTexto(x.fechaVuelo), x.numeroGuia ?? '', nombre(x.marca), x.destino?.codigo ?? '',
      x.piezas, x.fulls, x.pesoBruto, x.pesoCobrable ?? '', x.tarifa ?? '', x.flete, x.dueCarrier,
      ...codigos.map((k) => x.cargosAgencia[k]), x.iva, x.totalGuia, x.handling, x.totalCobrar]);
    const t = e.totales;
    const datos = [
      ['ESTADO DE CUENTA'],
      ['CLIENTE:', e.cliente.nombreFactura, '', 'RUC:', e.cliente.ruc ?? ''],
      ['PERÍODO:', `${fechaTexto(e.desde)} al ${fechaTexto(e.hasta)}`],
      [],
      cab,
      ...filas,
      ['TOTAL', `${t.guias} guías`, '', '', t.piezas, t.fulls, t.pesoBruto, '', '', t.flete, t.dueCarrier,
        ...codigos.map((k) => r2(e.filas.reduce((s, x) => s + x.cargosAgencia[k], 0))), t.iva, t.totalGuia, t.handling, t.totalCobrar],
    ];
    return { nombreArchivo: `estado-cuenta-${e.cliente.nombre.replace(/[^\w]+/g, '-')}-${e.desde}-${e.hasta}.xlsx`, contenido: libro('Estado de cuenta', datos) };
  }

  async ventasXlsx(f: FiltroCuentas): Promise<ArchivoReporte> {
    const v = await this.ventas(f);
    const cab = ['FECHA', 'N°', 'GUÍA', 'AEROLÍNEA', 'CLIENTE', 'MARCA', 'PESO COBRABLE AEROLÍNEA', 'COSTO AEROLÍNEA',
      'PESO COBRABLE CLIENTE', 'TARIFA CLIENTE', 'TOTAL GUÍA CLIENTE', 'HANDLING', 'TOTAL COBRADO', 'GANANCIA'];
    const filas = v.filas.map((x) => [fechaTexto(x.fechaVuelo), x.numero, x.numeroGuia ?? '', nombre(x.aerolinea), nombre(x.cliente),
      nombre(x.marca), '', x.costoAerolinea, x.pesoCobrable ?? '', x.tarifa ?? '', x.totalGuia, x.handling, x.totalCobrar, x.ganancia]);
    const resumen = (titulo: string, g: typeof v.porAerolinea) => [
      [],
      [titulo, 'GUÍAS', 'COSTO AEROLÍNEA', 'COBRADO', 'HANDLING', 'GANANCIA'],
      ...g.map((x) => [x.nombre, x.guias, x.costo, x.cobrado, x.handling, x.ganancia]),
    ];
    const t = v.totales;
    const datos = [
      ['VENTAS Y LIQUIDACIÓN'],
      ['PERÍODO:', `${fechaTexto(v.desde)} al ${fechaTexto(v.hasta)}`],
      [],
      cab,
      ...filas,
      ['TOTAL', `${t.guias} guías`, '', '', '', '', '', t.costoAerolinea, '', '', t.totalGuia, t.handling, t.totalCobrar, t.ganancia],
      ...resumen('POR AEROLÍNEA', v.porAerolinea),
      ...resumen('POR CLIENTE', v.porCliente),
    ];
    // El peso cobrable de la aerolínea va en la fila (columna G) para comparar con el del cliente.
    const pesos = await this.pesosAerolinea(v.filas.map((x) => x.id));
    v.filas.forEach((x, i) => ((datos[4 + i] as unknown[])[6] = pesos.get(x.id) ?? ''));
    return { nombreArchivo: `ventas-${v.desde}-${v.hasta}.xlsx`, contenido: libro('Ventas', datos) };
  }

  private async pesosAerolinea(ids: number[]): Promise<Map<number, number | null>> {
    const ls = await this.db.documentoLiquidacion.findMany({
      where: { idDocumentoCoordinacion: { in: ids }, tipo: 'NORMAL' },
      select: { idDocumentoCoordinacion: true, pesoCobrable: true },
    });
    return new Map(ls.map((l) => [l.idDocumentoCoordinacion, l.pesoCobrable]));
  }
}

function libro(nombreHoja: string, filas: unknown[][]): Buffer {
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const ancho = Math.max(...filas.map((f) => f.length));
  hoja['!cols'] = Array.from({ length: ancho }, (_, i) => ({ wch: i < 6 ? 16 : 13 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, nombreHoja);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
