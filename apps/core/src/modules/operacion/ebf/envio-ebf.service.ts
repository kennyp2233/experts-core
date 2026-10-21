import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { EbfCoordinacion, EbfLinea, Prisma, PrismaClient as PrismaEbf } from '@internal/ebf-portal-sync-client';
import { PRISMA_EBF_PORTAL_SYNC } from '../../sync/ebf-access/prisma/prisma-ebf-portal-sync.provider';
import { EbfPortalService } from '../../integrations/ebf-portal/ebf-portal.service';
import {
  COORDINACION_WINDOWS,
  describeWindows,
  isWithinWindow,
  nextWindowStart,
} from '../../integrations/ebf-portal/utils/horarios.util';
import { CajasPorTipo, cajasVacias, describirCajas, separarCajas, sumarCajas, totalCajas } from './cajas-ebf';
import {
  conciliar,
  FilaEbf,
  huellaDeseada,
  LineaDeseada,
  normEbf,
  PasoEbf,
  PlanLinea,
} from './conciliacion-ebf';
import { CoordinacionesEbfRepo, CoordinacionParaEbf } from './coordinaciones-ebf.repo';
import { EquivalenciasEbfService, MapaEquivalencias } from './equivalencias-ebf.service';
import { LecturaEbfService } from './lectura-ebf.service';
import {
  EstadoEbfCoordinacion,
  LineaEstadoEbf,
  modoEnvioEbf,
  ResumenEbf,
  VentanaEbf,
} from './envio-ebf.types';

const ZONA = 'America/Guayaquil';
const diaEcuador = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d);
const sumarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
/** Lo leído de EBF vale 2 minutos al abrir una coordinación. */
const VIGENCIA_LECTURA_MS = 2 * 60 * 1000;
/** Reintentos automáticos de un envío que falló (después, solo a mano). */
const MAX_INTENTOS = 3;
const PENDIENTES = ['POR_ENVIAR', 'CAMBIO_POR_ENVIAR', 'ERROR'];

/** "24-10-2026" (como empieza la etiqueta del vuelo en EBF). */
const fechaEtiqueta = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;

function revivirFilas(json: Prisma.JsonValue | null | undefined): FilaEbf[] {
  if (!Array.isArray(json)) return [];
  return (json as unknown as Array<FilaEbf & { creadaEn: string | null }>).map((f) => ({
    ...f,
    creadaEn: f.creadaEn ? new Date(f.creadaEn) : null,
  }));
}

interface ContextoEnvio {
  reg: EbfCoordinacion;
  eq: MapaEquivalencias;
  /** Vuelo (doc_coordinacion) de EBF, cuando ya se resolvió */
  vueloId: number | null;
  vuelo: string | null;
}

interface DetalleAccion {
  pasos: PasoEbf[];
  huella: string;
  /** Huella con la que falló el último envío: el error vale mientras no cambie */
  huellaError?: string;
}

/**
 * Envío de coordinaciones a EBF (ADR 0004). Lo que debe haber en EBF sale de
 * la coordinación; lo pendiente es la diferencia con lo último que se leyó,
 * una sola por guía hija, y se recalcula cada vez (no se apila). Antes de
 * enviar se relee EBF: si alguien ya lo hizo a mano, no se duplica.
 *
 * Todo lo que toca el portal pasa por una sola cadena (un envío a la vez).
 */
@Injectable()
export class EnvioEbfService {
  private readonly logger = new Logger(EnvioEbfService.name);
  private cadena: Promise<unknown> = Promise.resolve();

  constructor(
    @Inject(PRISMA_EBF_PORTAL_SYNC) private readonly ebf: PrismaEbf,
    private readonly repo: CoordinacionesEbfRepo,
    private readonly lectura: LecturaEbfService,
    private readonly equivalencias: EquivalenciasEbfService,
    private readonly portal: EbfPortalService,
  ) {}

  ventana(ahora = new Date()): VentanaEbf {
    const abierta = isWithinWindow(COORDINACION_WINDOWS, ZONA, ahora);
    const proxima = nextWindowStart(COORDINACION_WINDOWS, ZONA, ahora);
    return {
      abierta,
      proximaApertura: proxima.toISOString(),
      horario: describeWindows(COORDINACION_WINDOWS),
      diaEnvio: diaEcuador(abierta ? ahora : proxima),
    };
  }

  /** Un trabajo a la vez contra el portal. */
  private enCadena<T>(fn: () => Promise<T>): Promise<T> {
    const r = this.cadena.then(fn, fn);
    this.cadena = r.catch(() => undefined);
    return r;
  }

  // ================= Estado de una coordinación =================

  /**
   * Estado frente a EBF. Relee EBF si lo leído tiene más de 2 minutos (o si
   * `fresco`); si no, recalcula lo pendiente contra la última lectura.
   */
  async estado(idCoordinacion: number, opts: { fresco?: boolean } = {}): Promise<EstadoEbfCoordinacion> {
    const c = await this.repo.cargar(idCoordinacion);
    let reg = await this.registro(idCoordinacion, c);
    const vieja = !reg.leidoEn || Date.now() - reg.leidoEn.getTime() > VIGENCIA_LECTURA_MS;
    if (opts.fresco || vieja) {
      reg = await this.enCadena(() => this.refrescar(idCoordinacion, c, !!opts.fresco));
    }
    return this.armar(idCoordinacion, c, reg);
  }

  /** Lee EBF para la coordinación y guarda lo visto (no concilia). */
  private async refrescar(idCoordinacion: number, c: CoordinacionParaEbf | null, fresco: boolean): Promise<EbfCoordinacion> {
    const reg = await this.registro(idCoordinacion, c);
    const eq = await this.equivalencias.mapa();
    const marca = c?.idConsignatario ? (eq.MARCA.get(c.idConsignatario)?.ebfNombre ?? null) : null;
    try {
      const l = await this.lectura.leer({
        // Anulada: se busca por la guía que tenía (o la que mostraba EBF)
        numeroGuia: c?.numeroGuia ?? reg.numeroGuia,
        fechaVuelo: c?.fechaVuelo ?? reg.fechaVuelo.toISOString().slice(0, 10),
        marca,
        guiaFija: c ? null : reg.ebfGuia,
        hoy: diaEcuador(new Date()),
        fresco,
      });
      return await this.ebf.ebfCoordinacion.update({
        where: { id: reg.id },
        data: {
          ebfGuia: l.guia?.guia ?? null,
          ebfEstado: l.guia?.estado ?? null,
          ebfFulls: l.guia?.fulls ?? null,
          ebfCajas: l.guia?.cajas ?? null,
          ebfFullsBodega: l.guia?.fullsBodega ?? null,
          ebfCajasBodega: l.guia?.cajasBodega ?? null,
          ebfPesoBruto: l.guia?.pesoBruto ?? null,
          ebfPesoCobrable: l.guia?.pesoCobrable ?? null,
          ebfFilas: l.filas as unknown as Prisma.InputJsonValue,
          avisos: l.avisos,
          leidoEn: new Date(),
          errorLectura: null,
        },
      });
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.warn(`[ebf] no se pudo leer EBF para la coordinación ${idCoordinacion}: ${msg}`);
      return this.ebf.ebfCoordinacion.update({
        where: { id: reg.id },
        data: { errorLectura: `No se pudo leer EBF: ${msg}`, leidoEn: new Date() },
      });
    }
  }

  /**
   * El registro de la coordinación frente a EBF (lo crea la primera vez). Sin
   * coordinación (se anuló o ya no va con EBF) queda marcado como anulado: lo
   * que haya en EBF se debe borrar.
   */
  private async registro(idCoordinacion: number, c: CoordinacionParaEbf | null): Promise<EbfCoordinacion> {
    const ex = await this.ebf.ebfCoordinacion.findUnique({ where: { idCoordinacion } });
    if (!c) {
      if (!ex) throw new NotFoundException('Esta coordinación no va con EBF (su agencia IATA no es EBF).');
      return ex.anulada ? ex : this.ebf.ebfCoordinacion.update({ where: { id: ex.id }, data: { anulada: true } });
    }
    const datos = {
      numero: c.numero,
      numeroGuia: c.numeroGuia,
      fechaVuelo: new Date(`${c.fechaVuelo}T00:00:00Z`),
      idConsignatario: c.idConsignatario,
      enviable: c.enviable,
      anulada: false,
    };
    if (!ex) return this.ebf.ebfCoordinacion.create({ data: { idCoordinacion, ...datos } });
    // Otra fecha, guía o marca es otro vuelo en EBF: lo leído ya no vale
    const otroVuelo =
      ex.numeroGuia !== datos.numeroGuia ||
      ex.fechaVuelo.getTime() !== datos.fechaVuelo.getTime() ||
      ex.idConsignatario !== datos.idConsignatario;
    const igual = !otroVuelo && ex.numero === datos.numero && ex.enviable === datos.enviable && !ex.anulada;
    if (igual) return ex;
    return this.ebf.ebfCoordinacion.update({
      where: { id: ex.id },
      data: {
        ...datos,
        ...(otroVuelo
          ? {
              ebfVueloId: null,
              ebfVuelo: null,
              ebfGuia: null,
              ebfEstado: null,
              ebfFulls: null,
              ebfCajas: null,
              ebfFullsBodega: null,
              ebfCajasBodega: null,
              ebfPesoBruto: null,
              ebfPesoCobrable: null,
              ebfFilas: [],
              avisos: [],
              leidoEn: null,
            }
          : {}),
      },
    });
  }

  /** Lo que la coordinación dice que debe haber en EBF, por guía hija. */
  private async deseadas(c: CoordinacionParaEbf | null, eq: MapaEquivalencias, previas: EbfLinea[]): Promise<LineaDeseada[]> {
    const grupos = new Map<string, LineaDeseada & { porTipo: CajasPorTipo | null }>();
    for (const l of c?.lineas ?? []) {
      if (l.cajas <= 0 && l.fulls <= 0) continue; // novedades ("no llegó"): no van a EBF
      const clave = `${l.idConsignatario}|${l.idFinca}|${l.idProducto ?? '-'}|${l.dae}`;
      const partes = separarCajas(l.fulls, l.cajas, l.tipoCaja);
      const g = grupos.get(clave);
      if (g) {
        g.fulls = Math.round((g.fulls + l.fulls) * 1000) / 1000;
        g.cajas += l.cajas;
        g.porTipo = g.porTipo && partes ? sumarCajas(g.porTipo, partes) : null;
        g.cajasPorTipo = g.porTipo;
        continue;
      }
      grupos.set(clave, {
        clave,
        idFinca: l.idFinca,
        idProducto: l.idProducto,
        idConsignatario: l.idConsignatario,
        numeroGuiaHija: l.numeroGuiaHija,
        finca: l.finca,
        producto: l.producto,
        dae: l.dae,
        fulls: l.fulls,
        cajas: l.cajas,
        porTipo: partes,
        cajasPorTipo: partes,
        ebfExportador: eq.FINCA.get(l.idFinca)?.ebfNombre ?? null,
        ebfMarcacion: eq.MARCA.get(l.idConsignatario)?.ebfNombre ?? null,
        ebfProducto: l.idProducto !== null ? (eq.PRODUCTO.get(l.idProducto)?.ebfNombre ?? null) : null,
      });
    }
    // Las que ya no están (se quitaron o se anuló): deben quedar en cero en EBF
    const quitadas = previas.filter((p) => !grupos.has(p.clave) && !p.clave.startsWith('ebf:'));
    if (quitadas.length) {
      const [fincas, productos] = await Promise.all([
        this.repo.nombres('FINCA', quitadas.map((p) => p.idFinca)),
        this.repo.nombres('PRODUCTO', quitadas.map((p) => p.idProducto).filter((x): x is number => x !== null)),
      ]);
      for (const p of quitadas) {
        grupos.set(p.clave, {
          clave: p.clave,
          idFinca: p.idFinca,
          idProducto: p.idProducto,
          idConsignatario: p.idConsignatario,
          numeroGuiaHija: p.numeroGuiaHija,
          finca: fincas.get(p.idFinca) ?? `Finca ${p.idFinca}`,
          producto: (p.idProducto !== null ? productos.get(p.idProducto) : null) ?? '—',
          dae: p.dae ?? '',
          fulls: 0,
          cajas: 0,
          porTipo: cajasVacias(),
          cajasPorTipo: cajasVacias(),
          ebfExportador: eq.FINCA.get(p.idFinca)?.ebfNombre ?? p.ebfExportador,
          ebfMarcacion: eq.MARCA.get(p.idConsignatario)?.ebfNombre ?? null,
          ebfProducto: p.idProducto !== null ? (eq.PRODUCTO.get(p.idProducto)?.ebfNombre ?? p.ebfProducto) : p.ebfProducto,
        });
      }
    }
    return [...grupos.values()].map(({ porTipo: _p, ...d }) => d);
  }

  /**
   * Concilia contra la última lectura y guarda una línea por guía hija (y por
   * cada fila de EBF que no está en la coordinación). Devuelve las líneas para
   * mostrar.
   */
  private async conciliarYGuardar(
    c: CoordinacionParaEbf | null,
    reg: EbfCoordinacion,
  ): Promise<{ lineas: LineaEstadoEbf[]; eq: MapaEquivalencias }> {
    const eq = await this.equivalencias.mapa();
    const previas = await this.ebf.ebfLinea.findMany({ where: { idEbfCoordinacion: reg.id } });
    const porClave = new Map(previas.map((p) => [p.clave, p]));
    const deseadas = await this.deseadas(c, eq, previas);
    const vueloCerrado =
      /DEPARTED|DELIVERED/i.test(reg.ebfEstado ?? '') || reg.fechaVuelo.toISOString().slice(0, 10) < diaEcuador(new Date());
    const planes = conciliar(deseadas, revivirFilas(reg.ebfFilas), { hoy: this.ventana().diaEnvio, vueloCerrado });
    const nombresMarca = await this.repo.nombres('MARCA', [
      ...new Set(deseadas.map((d) => d.idConsignatario).filter((x) => x > 0)),
    ]);
    const marcaDe = (id: number | null) => (id !== null ? (nombresMarca.get(id) ?? null) : null);

    const salida: LineaEstadoEbf[] = [];
    const vigentes = new Set<string>();
    for (const plan of planes) {
      vigentes.add(plan.clave);
      const prev = porClave.get(plan.clave);
      const huella = huellaDeseada(plan.deseada);
      const detPrev = (prev?.accionDetalle ?? null) as unknown as DetalleAccion | null;
      let estado = plan.estado;
      let motivo = plan.motivo;
      let ultimoError = prev?.ultimoError ?? null;
      let intentos = prev?.intentos ?? 0;
      const pendiente = ['POR_ENVIAR', 'CAMBIO_POR_ENVIAR', 'PEDIR_A_EBF', 'SOLO_EN_EBF'].includes(estado);
      if (estado === 'EN_EBF' || !detPrev || detPrev.huellaError !== huella) {
        ultimoError = estado === 'EN_EBF' ? null : detPrev?.huellaError === huella ? ultimoError : null;
        if (!ultimoError) intentos = 0;
      }
      if (pendiente && prev?.omitidaHuella && prev.omitidaHuella === huella) {
        estado = 'OMITIDA';
        motivo = `No se envía (se dejó para hacerlo a mano). ${plan.motivo}`;
      } else if (ultimoError && plan.accion) {
        estado = 'ERROR';
        motivo = `El último envío falló: ${ultimoError}. ${plan.motivo}`;
      }
      const visto = this.vistoEnEbf(plan);
      const datos = {
        idFinca: plan.deseada?.idFinca ?? 0,
        idProducto: plan.deseada?.idProducto ?? null,
        idConsignatario: plan.deseada?.idConsignatario ?? 0,
        numeroGuiaHija: plan.deseada?.numeroGuiaHija ?? null,
        dae: plan.deseada?.dae ?? plan.filas[0]?.dae ?? null,
        fulls: plan.deseada?.fulls ?? 0,
        cajas: plan.deseada?.cajas ?? 0,
        cajasPorTipo: (plan.deseada?.cajasPorTipo ?? null) as unknown as Prisma.InputJsonValue,
        ebfDetalleIds: plan.filas.map((f) => f.detalleId).filter((x): x is number => x !== null),
        ebfHawb: visto?.hawb ?? null,
        ebfExportador: visto?.exportador ?? plan.deseada?.ebfExportador ?? null,
        ebfProducto: visto?.producto ?? plan.deseada?.ebfProducto ?? null,
        ebfDae: visto?.dae ?? null,
        ebfFulls: visto?.fulls ?? null,
        ebfCajas: visto?.cajas ?? null,
        ebfFullsBodega: visto?.fullsBodega ?? null,
        ebfCajasBodega: visto?.cajasBodega ?? null,
        ebfCreadoEn: plan.filas.map((f) => f.creadaEn).filter((x): x is Date => !!x).sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
        ebfCreadoPor: visto?.coordinadaPor ?? null,
        estado,
        accion: plan.accion,
        accionDetalle: {
          pasos: plan.pasos,
          huella,
          ...(ultimoError ? { huellaError: huella } : {}),
        } as unknown as Prisma.InputJsonValue,
        motivo,
        ultimoError,
        intentos,
        omitidaHuella: estado === 'EN_EBF' ? null : (prev?.omitidaHuella ?? null),
      };
      const guardada = prev
        ? await this.ebf.ebfLinea.update({ where: { id: prev.id }, data: datos })
        : await this.ebf.ebfLinea.create({ data: { ...datos, idEbfCoordinacion: reg.id, clave: plan.clave } });
      salida.push({
        id: guardada.id,
        clave: plan.clave,
        estado,
        accion: plan.accion,
        motivo,
        ultimoError,
        enviadaEn: guardada.enviadaEn?.toISOString() ?? null,
        idFinca: plan.deseada?.idFinca ?? null,
        idProducto: plan.deseada?.idProducto ?? null,
        idConsignatario: plan.deseada?.idConsignatario ?? null,
        faltan: plan.deseada
          ? ([
              !plan.deseada.ebfExportador && 'FINCA',
              !plan.deseada.ebfMarcacion && 'MARCA',
              !plan.deseada.ebfProducto && 'PRODUCTO',
            ].filter(Boolean) as LineaEstadoEbf['faltan'])
          : [],
        finca: plan.deseada?.finca ?? null,
        producto: plan.deseada?.producto ?? null,
        marca: marcaDe(plan.deseada?.idConsignatario ?? null),
        numeroGuiaHija: plan.deseada?.numeroGuiaHija ?? null,
        dae: plan.deseada?.dae ?? null,
        fulls: plan.deseada?.fulls ?? 0,
        cajas: plan.deseada?.cajas ?? 0,
        cajasPorTipo: plan.deseada?.cajasPorTipo ? describirCajas(plan.deseada.cajasPorTipo) : null,
        ebf: visto,
      });
    }
    const sobran = previas.filter((p) => !vigentes.has(p.clave)).map((p) => p.id);
    if (sobran.length) await this.ebf.ebfLinea.deleteMany({ where: { id: { in: sobran } } });
    return { lineas: salida, eq };
  }

  private vistoEnEbf(plan: PlanLinea): LineaEstadoEbf['ebf'] {
    if (!plan.filas.length) return null;
    const f0 = plan.filas[0];
    const suma = (k: 'fulls' | 'cajas' | 'fullsBodega' | 'cajasBodega') =>
      Math.round(plan.filas.reduce((s, f) => s + f[k], 0) * 1000) / 1000;
    const ultima = [...plan.filas].sort((a, b) => (b.creadaEn?.getTime() ?? 0) - (a.creadaEn?.getTime() ?? 0))[0];
    return {
      exportador: f0.exportador,
      producto: f0.producto,
      marcacion: f0.marcacion,
      dae: f0.dae,
      fulls: suma('fulls'),
      cajas: suma('cajas'),
      fullsBodega: suma('fullsBodega'),
      cajasBodega: suma('cajasBodega'),
      hawb: f0.hawb,
      filas: plan.filas.length,
      coordinadaPor: ultima.creadaPor,
      diaCoordinacion: ultima.diaCoordinacion,
    };
  }

  private async armar(idCoordinacion: number, c: CoordinacionParaEbf | null, reg: EbfCoordinacion): Promise<EstadoEbfCoordinacion> {
    const { lineas, eq } = await this.conciliarYGuardar(c, reg);
    const modo = modoEnvioEbf();
    const ventana = this.ventana();
    const resumen = resumir(lineas);
    const pendientes = resumen.porEnviar + resumen.errores;
    let motivoNoEnviar: string | null = null;
    if (modo === 'comparar') motivoNoEnviar = 'El envío a EBF está en modo comparación: se muestra lo que se enviaría, no se envía nada.';
    else if (!reg.enviable) motivoNoEnviar = 'Viene del sistema viejo: la oficina la tipeó en EBF. Solo se compara.';
    else if (!pendientes) motivoNoEnviar = 'No hay nada por enviar.';
    else if (!ventana.abierta) motivoNoEnviar = `EBF está cerrado (${ventana.horario}).`;
    else if (!reg.ebfGuia) motivoNoEnviar = 'EBF todavía no tiene la guía de esta marca para ese día (la abre EBF con la reserva).';
    const marca = c?.idConsignatario ? (eq.MARCA.get(c.idConsignatario)?.ebfNombre ?? c.consignatario) : null;
    return {
      idCoordinacion,
      numero: reg.numero,
      numeroGuia: reg.numeroGuia,
      fechaVuelo: reg.fechaVuelo.toISOString().slice(0, 10),
      marca,
      enviable: reg.enviable,
      anulada: reg.anulada,
      modo,
      ventana,
      ebf: {
        guia: reg.ebfGuia,
        provisional: !!reg.ebfGuia && /^EBF/i.test(reg.ebfGuia),
        estado: reg.ebfEstado,
        fulls: reg.ebfFulls,
        cajas: reg.ebfCajas,
        fullsBodega: reg.ebfFullsBodega,
        cajasBodega: reg.ebfCajasBodega,
        pesoBruto: reg.ebfPesoBruto,
        pesoCobrable: reg.ebfPesoCobrable,
        leidoEn: reg.leidoEn?.toISOString() ?? null,
        errorLectura: reg.errorLectura,
        avisos: Array.isArray(reg.avisos) ? (reg.avisos as string[]) : [],
      },
      resumen,
      lineas: ordenarLineas(lineas),
      puedeEnviar: motivoNoEnviar === null,
      motivoNoEnviar,
    };
  }

  // ================= Cola =================

  /**
   * Lo pendiente de todas las coordinaciones con EBF que vuelan de ayer a 7
   * días (y las anuladas que dejaron algo en EBF), recalculado contra la
   * última lectura. No lee EBF: eso lo hace el ciclo o al abrir la coordinación.
   */
  async cola(): Promise<{ modo: string; ventana: VentanaEbf; coordinaciones: EstadoEbfCoordinacion[] }> {
    const hoy = diaEcuador(new Date());
    const ids = new Set(await this.repo.idsConEbf(sumarDias(hoy, -1), sumarDias(hoy, 7)));
    const conPendiente = await this.ebf.ebfLinea.findMany({
      where: { estado: { in: [...PENDIENTES, 'PEDIR_A_EBF', 'OMITIDA'] } },
      select: { coordinacion: { select: { idCoordinacion: true, fechaVuelo: true } } },
    });
    for (const l of conPendiente) {
      if (l.coordinacion.fechaVuelo.toISOString().slice(0, 10) >= sumarDias(hoy, -3)) ids.add(l.coordinacion.idCoordinacion);
    }
    const coordinaciones: EstadoEbfCoordinacion[] = [];
    for (const id of ids) {
      const c = await this.repo.cargar(id);
      const reg = await this.registro(id, c).catch(() => null);
      if (reg) coordinaciones.push(await this.armar(id, c, reg));
    }
    coordinaciones.sort((a, b) => a.fechaVuelo.localeCompare(b.fechaVuelo) || (a.numero ?? 0) - (b.numero ?? 0));
    return { modo: modoEnvioEbf(), ventana: this.ventana(), coordinaciones };
  }

  // ================= Acciones de la oficina =================

  /** "No enviar este cambio": vale mientras la línea no cambie en la coordinación. */
  async omitir(idLinea: number, usuario?: string) {
    const l = await this.ebf.ebfLinea.findUnique({ where: { id: idLinea }, include: { coordinacion: true } });
    if (!l) throw new NotFoundException('Línea no encontrada.');
    const huella = ((l.accionDetalle ?? {}) as unknown as DetalleAccion).huella ?? '-';
    await this.ebf.ebfLinea.update({ where: { id: idLinea }, data: { omitidaHuella: huella, estado: 'OMITIDA' } });
    await this.bitacora(l.coordinacion.idCoordinacion, l.clave, 'OMITIR', 'OK', { motivo: l.motivo }, usuario);
    return this.estado(l.coordinacion.idCoordinacion);
  }

  async reactivar(idLinea: number, usuario?: string) {
    const l = await this.ebf.ebfLinea.findUnique({ where: { id: idLinea }, include: { coordinacion: true } });
    if (!l) throw new NotFoundException('Línea no encontrada.');
    await this.ebf.ebfLinea.update({ where: { id: idLinea }, data: { omitidaHuella: null } });
    await this.bitacora(l.coordinacion.idCoordinacion, l.clave, 'REACTIVAR', 'OK', null, usuario);
    return this.estado(l.coordinacion.idCoordinacion);
  }

  /** "Ya lo hice en EBF" / "Revisar EBF": relee en vivo y deja constancia de lo que quedó. */
  async revisar(idCoordinacion: number, usuario?: string) {
    const e = await this.estado(idCoordinacion, { fresco: true });
    await this.bitacora(idCoordinacion, null, 'REVISAR', 'OK', { resumen: e.resumen }, usuario);
    return e;
  }

  async bitacoraDe(idCoordinacion: number) {
    return this.ebf.ebfBitacora.findMany({ where: { idCoordinacion }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  // ================= Envío =================

  /**
   * Envía lo pendiente de una coordinación: relee EBF en vivo, recalcula y
   * ejecuta los pasos de cada guía hija (uno a la vez). Lo que ya estaba en
   * EBF (porque alguien lo hizo a mano) se cierra sin enviar.
   */
  async enviar(idCoordinacion: number, usuario?: string, opts: { automatico?: boolean } = {}) {
    const modo = modoEnvioEbf();
    if (modo === 'comparar') {
      throw new BadRequestException('El envío a EBF está en modo comparación (EBF_ENVIO_MODO=comparar): no se envía nada.');
    }
    const v = this.ventana();
    if (!v.abierta) {
      throw new BadRequestException(`EBF está cerrado (${v.horario}). Lo pendiente se puede enviar desde ${v.proximaApertura}.`);
    }
    const c = await this.repo.cargar(idCoordinacion);
    const reg0 = await this.ebf.ebfCoordinacion.findUnique({ where: { idCoordinacion } });
    if (!c && !reg0) throw new NotFoundException('Esta coordinación no va con EBF.');
    if (!(c?.enviable ?? reg0?.enviable)) {
      throw new ForbiddenException('Viene del sistema viejo: la oficina la tipeó en EBF. Solo se compara.');
    }

    return this.enCadena(async () => {
      const reg = await this.refrescar(idCoordinacion, c, true);
      const { lineas } = await this.conciliarYGuardar(c, reg);
      const aEnviar = await this.ebf.ebfLinea.findMany({
        where: {
          idEbfCoordinacion: reg.id,
          estado: { in: PENDIENTES },
          ...(opts.automatico ? { intentos: { lt: MAX_INTENTOS } } : {}),
        },
      });
      const resultado = { enviadas: 0, fallidas: 0, errores: [] as string[] };
      if (aEnviar.length) {
        if (!reg.ebfGuia) throw new BadRequestException('EBF todavía no tiene la guía de esta marca para ese día.');
        const eq = await this.equivalencias.mapa();
        const ctx: ContextoEnvio = { reg, eq, vueloId: reg.ebfVueloId, vuelo: reg.ebfVuelo };
        for (const linea of aEnviar) {
          const det = (linea.accionDetalle ?? { pasos: [] }) as unknown as DetalleAccion;
          const mostrada = lineas.find((x) => x.id === linea.id);
          try {
            for (const paso of det.pasos) {
              const respuesta = await this.ejecutarPaso(paso, linea, ctx);
              await this.bitacora(idCoordinacion, linea.clave, paso.tipo, 'OK', { paso, respuesta }, usuario ?? (opts.automatico ? 'automático' : undefined));
            }
            await this.ebf.ebfLinea.update({ where: { id: linea.id }, data: { enviadaEn: new Date(), ultimoError: null, intentos: 0 } });
            resultado.enviadas++;
          } catch (err) {
            const msg = (err as Error).message;
            resultado.fallidas++;
            resultado.errores.push(`${mostrada?.finca ?? linea.clave}: ${msg}`);
            await this.ebf.ebfLinea.update({
              where: { id: linea.id },
              data: {
                ultimoError: msg,
                intentos: { increment: 1 },
                accionDetalle: { ...det, huellaError: det.huella } as unknown as Prisma.InputJsonValue,
              },
            });
            await this.bitacora(idCoordinacion, linea.clave, linea.accion ?? 'ENVIAR', 'ERROR', { error: msg, pasos: det.pasos }, usuario);
          }
        }
        if (ctx.vueloId && ctx.vueloId !== reg.ebfVueloId) {
          await this.ebf.ebfCoordinacion.update({ where: { id: reg.id }, data: { ebfVueloId: ctx.vueloId, ebfVuelo: ctx.vuelo } });
        }
      }
      // Releer para ver lo que quedó (y capturar las filas nuevas)
      this.lectura.olvidar();
      const final = await this.refrescar(idCoordinacion, c, true);
      return { ...resultado, estado: await this.armar(idCoordinacion, c, final) };
    });
  }

  /**
   * Lo que se enviaría ahora, resuelto contra EBF (vuelo, id de la DAE,
   * producto) pero sin escribir nada. Sirve en modo comparación para validar
   * antes de encender el envío, y para ver de antemano si EBF lo va a rechazar
   * (p. ej. una DAE que la finca no registró en EBF para ese país).
   */
  async simular(idCoordinacion: number) {
    const c = await this.repo.cargar(idCoordinacion);
    return this.enCadena(async () => {
      const reg = await this.refrescar(idCoordinacion, c, true);
      const { lineas } = await this.conciliarYGuardar(c, reg);
      const eq = await this.equivalencias.mapa();
      const ctx: ContextoEnvio = { reg, eq, vueloId: reg.ebfVueloId, vuelo: reg.ebfVuelo };
      const pendientes = await this.ebf.ebfLinea.findMany({ where: { idEbfCoordinacion: reg.id, estado: { in: PENDIENTES } } });
      const pasos: Array<{ finca: string | null; producto: string | null; tipo: string; ok: boolean; envio?: unknown; error?: string }> = [];
      for (const linea of pendientes) {
        const det = (linea.accionDetalle ?? { pasos: [] }) as unknown as DetalleAccion;
        const mostrada = lineas.find((x) => x.id === linea.id);
        for (const paso of det.pasos) {
          try {
            pasos.push({ finca: mostrada?.finca ?? null, producto: mostrada?.producto ?? null, tipo: paso.tipo, ok: true, envio: await this.ejecutarPaso(paso, linea, ctx, true) });
          } catch (err) {
            pasos.push({ finca: mostrada?.finca ?? null, producto: mostrada?.producto ?? null, tipo: paso.tipo, ok: false, error: (err as Error).message });
          }
        }
      }
      return { idCoordinacion, vuelo: ctx.vuelo, pasos };
    });
  }

  /**
   * Un paso contra el portal. `simular`: resuelve todo (vuelo, DAE, producto)
   * con lecturas y devuelve lo que se mandaría, sin escribir.
   */
  private async ejecutarPaso(
    paso: PasoEbf,
    linea: EbfLinea,
    ctx: ContextoEnvio,
    simular = false,
  ): Promise<Record<string, unknown>> {
    const cajas = paso.cajas ?? cajasVacias();
    if (paso.tipo === 'BORRAR' || paso.tipo === 'MODIFICAR') {
      if (!paso.detalleId) {
        if (simular) return { detalleId: null, cajas: describirCajas(cajas), nota: 'EBF muestra el id de la fila solo en horario' };
        throw new Error('EBF no mostró el id de la fila (se leyó fuera de horario): vuelva a intentar.');
      }
      if (simular) return { detalleId: paso.detalleId, cajas: describirCajas(cajas) };
      if (paso.tipo === 'BORRAR') {
        const r = await this.portal.update.deleteCoordinacion(paso.detalleId);
        if (!r.ok) throw new Error(`EBF no borró la fila: ${(r.errors ?? []).join('; ') || `respuesta ${r.status}`}`);
        return { status: r.status };
      }
      const spec = await this.portal.update.getUpdateForm(paso.detalleId);
      const r = await this.portal.update.updateCoordinacion(paso.detalleId, {
        productoId: spec.currentProductoId ?? undefined,
        fbCoo: cajas.FB,
        hbCoo: cajas.HB,
        qbCoo: cajas.QB,
        ebCoo: cajas.EB,
      });
      if (!r.ok) throw new Error(`EBF no aceptó el cambio: ${(r.errors ?? []).join('; ') || `respuesta ${r.status}`}`);
      return { status: r.status };
    }

    // CREAR
    const finca = ctx.eq.FINCA.get(linea.idFinca);
    const marca = ctx.eq.MARCA.get(linea.idConsignatario);
    const producto = linea.idProducto !== null ? ctx.eq.PRODUCTO.get(linea.idProducto) : undefined;
    if (!finca?.ebfId) throw new Error('Falta el id de EBF de la finca: enlazarla en "Enlaces con EBF".');
    if (!marca?.ebfId) throw new Error('Falta el id de EBF de la marca: enlazarla en "Enlaces con EBF".');
    if (!producto) throw new Error('Falta enlazar el producto con EBF.');
    if (totalCajas(cajas) <= 0) throw new Error('No hay cajas para coordinar.');

    if (!ctx.vueloId) {
      const v = await this.vueloEbf(finca.ebfId, marca.ebfId, ctx);
      ctx.vueloId = v.id;
      ctx.vuelo = v.etiqueta;
    }
    const vueloId = ctx.vueloId;
    const daes = await this.portal.selection.listDaes(finca.ebfId, marca.ebfId, vueloId);
    const dae = daes.find((d) => d.label.trim() === (paso.dae ?? '').trim());
    if (!dae) {
      throw new Error(
        `La DAE ${paso.dae} no está registrada en EBF para ${finca.ebfNombre} en este vuelo. EBF ofrece: ${
          daes.map((d) => d.label).join(', ') || 'ninguna'
        }.`,
      );
    }
    const daeId = parseInt(dae.value, 10);
    const form = await this.portal.create.getCreateForm({ exportadorId: finca.ebfId, marcacionId: marca.ebfId, vueloId, daeId });
    const opcion =
      (producto.ebfId ? form.productos.find((p) => p.value === String(producto.ebfId)) : undefined) ??
      form.productos.find((p) => normEbf(p.label) === normEbf(producto.ebfNombre));
    if (!opcion) {
      throw new Error(
        `EBF no ofrece «${producto.ebfNombre}» para ${finca.ebfNombre}. Ofrece: ${form.productos.map((p) => p.label).join(', ') || 'nada'}.`,
      );
    }
    if (opcion.errorMessage) throw new Error(`EBF no deja coordinar ${opcion.label}: ${opcion.errorMessage}`);
    if (opcion.isCompoundProduct) throw new Error(`${opcion.label} es un producto compuesto en EBF: coordinarlo a mano.`);
    if (cajas.FB > 0 && !opcion.isFullBxs) throw new Error(`EBF no acepta cajas full (FB) de ${opcion.label}.`);
    if (linea.idProducto !== null) await this.equivalencias.guardarIdProducto(linea.idProducto, parseInt(opcion.value, 10));

    const dto = {
      exportadorId: finca.ebfId,
      consignatarioMarcacionId: marca.ebfId,
      docCoordinacionId: vueloId,
      daeId,
      productoId: parseInt(opcion.value, 10),
      fbCoo: cajas.FB,
      hbCoo: cajas.HB,
      qbCoo: cajas.QB,
      ebCoo: cajas.EB,
    };
    if (simular) {
      return {
        exportador: finca.ebfNombre,
        marcacion: marca.ebfNombre,
        vuelo: ctx.vuelo,
        dae: dae.label,
        producto: opcion.label,
        cajas: describirCajas(cajas),
        dto,
      };
    }
    const r = await this.portal.create.createCoordinacion(dto);
    if (!r.ok) throw new Error(`EBF no aceptó la coordinación: ${(r.errors ?? []).join('; ') || `respuesta ${r.status}`}`);
    return { status: r.status, vueloId, daeId, productoId: opcion.value };
  }

  /**
   * El "vuelo" de EBF (cliente × marcación × fecha × ruta) de la coordinación:
   * el de la fecha del vuelo. Si EBF tiene más de uno ese día para la marca,
   * no se adivina.
   */
  private async vueloEbf(exportadorId: number, marcacionId: number, ctx: { reg: EbfCoordinacion }): Promise<{ id: number; etiqueta: string }> {
    const fecha = ctx.reg.fechaVuelo.toISOString().slice(0, 10);
    const opciones = await this.portal.selection.listVuelos(exportadorId, marcacionId);
    const delDia = opciones.filter((o) => o.label.trim().startsWith(fechaEtiqueta(fecha)));
    if (delDia.length === 1) return { id: parseInt(delDia[0].value, 10), etiqueta: delDia[0].label };
    if (!delDia.length) {
      throw new Error(`EBF no tiene abierto un vuelo de esta marca para el ${fecha} (opciones: ${opciones.map((o) => o.label).join(' | ') || 'ninguna'}).`);
    }
    throw new Error(`EBF tiene ${delDia.length} vuelos de esta marca el ${fecha}: ${delDia.map((o) => o.label).join(' | ')}. Coordinar a mano.`);
  }

  private async bitacora(
    idCoordinacion: number,
    clave: string | null,
    accion: string,
    resultado: string,
    detalle: unknown,
    usuario?: string,
  ) {
    await this.ebf.ebfBitacora.create({
      data: {
        idCoordinacion,
        clave,
        accion,
        resultado,
        detalle: (detalle ?? undefined) as Prisma.InputJsonValue | undefined,
        usuario: usuario ?? null,
      },
    });
  }

  // ================= Ciclo =================

  /**
   * Ciclo periódico: relee EBF para las coordinaciones activas (vuelo de ayer
   * a 7 días) y, en modo automático y con EBF abierto, envía lo pendiente de
   * las creadas en el sistema nuevo. Si todavía no hay enlaces, primero los
   * aprende del historial.
   */
  async ciclo(): Promise<{ leidas: number; enviadas: number; errores: string[] }> {
    const hoy = diaEcuador(new Date());
    // La primera vez (base nueva) los enlaces se aprenden del historial; después, a mano o con el botón
    if ((await this.ebf.ebfEquivalencia.count()) === 0) {
      await this.equivalencias.aprender(45).catch((err) => this.logger.warn(`[ebf] no se pudo aprender del historial: ${(err as Error).message}`));
    }
    const ids = await this.repo.idsConEbf(sumarDias(hoy, -1), sumarDias(hoy, 7));
    // Las que ya no están activas (se anularon o cambiaron de agencia) pueden haber dejado filas en EBF
    const registradas = await this.ebf.ebfCoordinacion.findMany({
      where: { enviable: true, fechaVuelo: { gte: new Date(`${sumarDias(hoy, -1)}T00:00:00Z`) } },
      select: { idCoordinacion: true },
    });
    for (const a of registradas) if (!ids.includes(a.idCoordinacion)) ids.push(a.idCoordinacion);
    const r = { leidas: 0, enviadas: 0, errores: [] as string[] };
    const automatico = modoEnvioEbf() === 'automatico' && this.ventana().abierta;
    for (const id of ids) {
      try {
        const e = await this.estado(id, { fresco: true });
        r.leidas++;
        if (automatico && e.enviable && e.resumen.porEnviar + e.resumen.errores > 0 && e.ebf.guia) {
          const s = await this.enviar(id, undefined, { automatico: true });
          r.enviadas += s.enviadas;
          r.errores.push(...s.errores);
        }
      } catch (err) {
        r.errores.push(`coordinación ${id}: ${(err as Error).message}`);
      }
    }
    return r;
  }
}

function resumir(lineas: LineaEstadoEbf[]): ResumenEbf {
  const n = (...estados: string[]) => lineas.filter((l) => estados.includes(l.estado)).length;
  return {
    lineas: lineas.filter((l) => l.estado !== 'SOLO_EN_EBF').length,
    enEbf: n('EN_EBF'),
    porEnviar: n('POR_ENVIAR', 'CAMBIO_POR_ENVIAR'),
    pedirAEbf: n('PEDIR_A_EBF'),
    faltaEnlace: n('FALTA_ENLACE'),
    soloEnEbf: n('SOLO_EN_EBF'),
    errores: n('ERROR'),
    omitidas: n('OMITIDA'),
  };
}

/** Primero lo que pide atención; dentro, por finca. */
function ordenarLineas(lineas: LineaEstadoEbf[]): LineaEstadoEbf[] {
  const peso: Record<string, number> = {
    ERROR: 0,
    PEDIR_A_EBF: 1,
    FALTA_ENLACE: 2,
    CAMBIO_POR_ENVIAR: 3,
    POR_ENVIAR: 4,
    SOLO_EN_EBF: 5,
    OMITIDA: 6,
    EN_EBF: 7,
  };
  return [...lineas].sort(
    (a, b) => (peso[a.estado] ?? 9) - (peso[b.estado] ?? 9) || (a.finca ?? a.ebf?.exportador ?? '').localeCompare(b.finca ?? b.ebf?.exportador ?? ''),
  );
}
