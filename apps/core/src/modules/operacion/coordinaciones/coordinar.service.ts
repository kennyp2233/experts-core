import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { asegurarEditable } from '../comun/modo-operacion';
import { inicioCoordinacion, inicioGuiaHija, siguiente } from '../comun/contadores';
import { recalcularEstadoIngresos } from '../guias/estado-ingreso';
import {
  cargosAgencia,
  CODIGOS_AGENCIA,
  ConceptoAerolinea,
  defaultsAerolinea,
  r2,
  ResumenLiquidacion,
  resumirLiquidacion,
  ValoresLiquidacion,
} from '../calculos/liquidacion';
import {
  agruparEnGuiasHijas,
  claveGuiaHija,
  LineaCalculo,
  totalesDeLineas,
  volumenDeLineas,
} from '../calculos/reglas/totales';
import {
  CorregirCoordinacionDto,
  GuardarCoordinacionDto,
  LineaCoordinacionDto,
  TramoRutaDto,
  TransferirLineasDto,
  ValoresLiquidacionDto,
} from './dto/guardar-coordinacion.dto';

/** Patrón de la DAE / FUE de SENAE: 055-2026-40-00751482. */
const PATRON_DAE = /^\d{3}-\d{4}-\d{2}-\d{8}$/;
const dia = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Alguien grabó la coordinación desde que se leyó (una finca cargó por el
 * portal u otro usuario grabó): no se pisa su cambio.
 */
export class CoordinacionCambiadaException extends ConflictException {
  constructor() {
    super('La coordinación cambió mientras la editabas (una finca cargó o alguien más grabó). Ábrela de nuevo para no perder esos cambios.');
  }
}

interface LineaPreparada extends LineaCoordinacionDto {
  idConsignatario: number;
  codigoProducto: string | null;
  fullsCalculados: number;
}

/** Resultado de armar una coordinación (lo que se guardaría). */
export interface CoordinacionArmada {
  guiasHijas: Array<{
    clave: string;
    numeroGuiaHija: string | null;
    idFinca: number;
    idConsignatario: number;
    dae: string;
    pesoBruto: number;
    totalPiezas: number;
    totalFulls: number;
    lineas: LineaPreparada[];
  }>;
  totales: { cajas: number; fulls: number; kgs: number; volumen: number };
  /** La que vale (la del cliente si se cobra distinto, si no la de la guía madre). */
  liquidacion: ResumenLiquidacion;
  /** Lo que cobra la aerolínea (guía madre). */
  aerolinea: ResumenLiquidacion;
  /** Lo que se le cobra al cliente, si es distinto. */
  cliente: ResumenLiquidacion | null;
  /** Ganancia de la guía: cobro al cliente − guía madre (hoy no hay comisión). */
  diferencia: { tarifa: number | null; flete: number | null; total: number | null } | null;
  /** Defaults: tarifa y conceptos de la aerolínea sobre el peso actual; handling del cliente. */
  sugerida: Partial<ValoresLiquidacion>;
  /** Cobro al cliente propuesto: lo de la última guía de la misma marca. */
  sugeridaCliente: {
    valores: Partial<ValoresLiquidacion>;
    desde: { id: number; numeroGuia: string | null; fechaVuelo: string };
  } | null;
  advertencias: string[];
}

/**
 * Lo que se propone para el cobro al cliente, tomado de la última guía de la
 * marca. Son precios que se ponen "al ojo": no hay fórmula. Acierto medido en
 * 2020–2023: Form A 98 %, Fitos 96 %, Mca 94 %, Tax/Termógrafo 98–99 %,
 * tarifa ~80 %, Transport 41 % (varía mucho, hay que revisarlo).
 */
const CAMPOS_COBRO_CLIENTE = ['tarifa', 'cargoAwa', 'cargoCha', 'cargoTax', 'cargoMma', 'cargoHawb', 'cargoFitos'] as const;

/** Lo que la pantalla de coordinar necesita para proponer valores. */
export interface ParametrosCoordinacion {
  /** Defaults de línea (_PIN_MParams): cajas = fulls × cajasPorFull, etc. */
  lineas: { cajasPorFull: number; kgPorCaja: number; tallosPorFull: number; valorPorCaja: number };
  /** Tipos de caja (FB, HB, QB, EB) y cuántos fulls vale cada una. */
  tiposCaja: Array<{ id: number; codigo: string | null; nombre: string; factorFull: number }>;
  /** Rótulos de los 7 códigos de agencia (_PARAMETROS CODAGE0..6). */
  etiquetasAgencia: Record<(typeof CODIGOS_AGENCIA)[number], string>;
  aerolinea: {
    id: number;
    tarifa: number | null;
    pca: number | null;
    conceptos: Array<ConceptoAerolinea & { abreviatura: string | null }>;
  } | null;
}

const CAMPO_CONCEPTO: Record<string, ConceptoAerolinea['campo']> = {
  COSTO_GUIA: 'guiaAerea',
  COMBUSTIBLE: 'combustible',
  SEGURIDAD: 'seguridad',
  OTROS: 'otros',
  AUX1: 'aux1',
  AUX2: 'aux2',
  AUX_CALCULO: 'calAux',
  IVA: 'iva',
};

/**
 * Coordinar en el sistema nuevo: armar (validar, agrupar en guías hijas,
 * totalizar, liquidar), guardar, editar, cortar y anular. Mismas reglas que el
 * sistema viejo (legacy-analysis frmPIN_Coordina / frmPIN_CoorDetail):
 * número de guía y fecha obligatorios, DAE obligatoria por línea, una guía
 * hija por marca + finca + producto, no se modifica una guía cortada.
 */
@Injectable()
export class CoordinarService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  /**
   * Arma sin guardar (vista previa). Con `id` (al editar) muestra los números
   * de guía hija que se conservarían.
   */
  async simular(dto: GuardarCoordinacionDto, id?: number): Promise<CoordinacionArmada> {
    if (!id) return this.armar(dto, new Map());
    const actual = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: { guiaHijas: { include: { detalles: true } } },
    });
    return this.armar(dto, actual ? await this.numerosExistentes(actual.guiaHijas) : new Map(), id);
  }

  /** Defaults de línea, rótulos de agencia y conceptos de la aerolínea. */
  async parametros(idAerolinea?: number): Promise<ParametrosCoordinacion> {
    const params = await this.maestros.parametro.findMany({
      where: { OR: [{ clave: { startsWith: 'MPARAMS.par' } }, { clave: { startsWith: 'PARAMETROS.CODAGE' } }] },
    });
    const p = new Map(params.map((x) => [x.clave, x]));
    const n = (k: string, def: number) => p.get(`MPARAMS.${k}`)?.valorNumero ?? def;
    const etiquetasAgencia = Object.fromEntries(
      CODIGOS_AGENCIA.map((c, i) => [c, p.get(`PARAMETROS.CODAGE${i}`)?.valorTexto ?? c.replace('cargo', '').toUpperCase()]),
    ) as ParametrosCoordinacion['etiquetasAgencia'];
    return {
      lineas: {
        cajasPorFull: n('parPCSxFULL', 2),
        kgPorCaja: n('parKGSxPCS', 22),
        tallosPorFull: n('parSTEMSxFULL', 700),
        valorPorCaja: n('parFacValDefault', 140),
      },
      tiposCaja: (await this.db.tipoCaja.findMany({ orderBy: { factorFull: 'desc' } })).map((t) => ({
        id: t.id,
        codigo: t.codigo,
        nombre: t.nombre,
        factorFull: t.factorFull,
      })),
      etiquetasAgencia,
      aerolinea: idAerolinea ? await this.conceptosAerolinea(idAerolinea) : null,
    };
  }

  async crear(dto: GuardarCoordinacionDto, usuario?: string) {
    const guia = await this.guiaDisponible(dto.idGuiaMadre);
    const armada = await this.armar(dto, new Map());
    return this.db.$transaction(async (tx) => {
      const id = await this.persistir(tx, null, dto, armada, guia.idAerolinea, usuario);
      await tx.guiaMadre.update({ where: { id: guia.id }, data: { estado: 'COORDINADA' } });
      await recalcularEstadoIngresos(tx, [guia.idDocumentoBase]);
      return { id };
    }, { timeout: 60_000 });
  }

  /**
   * `origen`: de dónde vienen las líneas nuevas ('E' = la finca por el portal,
   * como `detOrigen` del viejo). `dto.version`: si la coordinación cambió desde
   * que se cargó (una finca cargó, otro usuario grabó), no se pisa.
   */
  async actualizar(id: number, dto: GuardarCoordinacionDto, usuario?: string, origen?: string) {
    const actual = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: { guiaHijas: { include: { detalles: true } } },
    });
    if (!actual) throw new NotFoundException('La coordinación no existe.');
    asegurarEditable(actual, `La coordinación ${actual.numeroGuia ?? id}`);
    if (actual.estadoActual === 'CORTADO') {
      throw new ConflictException('La guía ya fue cortada: no puede modificarse.');
    }
    if (dto.version && new Date(dto.version).getTime() !== actual.updatedAt.getTime()) {
      throw new CoordinacionCambiadaException();
    }
    const numeros = await this.numerosExistentes(actual.guiaHijas);
    const cambiaGuia = dto.idGuiaMadre !== actual.idGuiaMadre;
    const guia = cambiaGuia
      ? await this.guiaDisponible(dto.idGuiaMadre)
      : await this.db.guiaMadre.findUniqueOrThrow({ where: { id: actual.idGuiaMadre } });
    const armada = await this.armar(dto, numeros, id, origen);
    return this.db.$transaction(async (tx) => {
      // Dos grabaciones a la vez (dos fincas cargando) no se pisan: se bloquea la
      // fila hasta el commit y, si otra grabó desde que se leyó, esta falla.
      const [fila] = await tx.$queryRaw<Array<{ updatedAt: Date }>>`
        SELECT "updatedAt" FROM "DocumentoCoordinacion" WHERE "id" = ${id} FOR UPDATE`;
      if (fila.updatedAt.getTime() !== actual.updatedAt.getTime()) throw new CoordinacionCambiadaException();
      await this.persistir(tx, id, dto, armada, guia.idAerolinea, usuario, origen);
      if (cambiaGuia) {
        const anterior = await tx.guiaMadre.update({ where: { id: actual.idGuiaMadre }, data: { estado: 'INGRESADA' } });
        await tx.guiaMadre.update({ where: { id: guia.id }, data: { estado: 'COORDINADA' } });
        await recalcularEstadoIngresos(tx, [anterior.idDocumentoBase, guia.idDocumentoBase]);
      }
      return { id };
    }, { timeout: 60_000 });
  }

  /**
   * La coordinación grabada, como el DTO de coordinar: para agregarle, cambiar
   * o quitarle líneas (portal de fincas) sin tocar el resto. Cada línea lleva su
   * `idLinea`, así conserva quién y cuándo la registró; `version` es la de ese
   * momento.
   */
  async dtoDe(id: number): Promise<{ dto: GuardarCoordinacionDto; estado: string; codigoAccess: number | null }> {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: {
        liquidaciones: true,
        rutas: { orderBy: { orden: 'asc' } },
        manifiesto: true,
        guiaHijas: { orderBy: { secuencial: 'asc' }, include: { detalles: { orderBy: { numeroLinea: 'asc' } } } },
      },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    const sinNulos = (o: object) =>
      Object.fromEntries(
        Object.entries(o).filter(([k, v]) => v !== null && !['id', 'idDocumentoCoordinacion', 'tipo', 'calculaPca'].includes(k)),
      );
    const normal = c.liquidaciones.find((l) => l.tipo === 'NORMAL');
    const extra = c.corteExtra ? c.liquidaciones.find((l) => l.tipo === 'CORTE_EXTRA') : undefined;
    const iso = (d: Date | null) => (d ? d.toISOString() : undefined);
    const via = c.rutas.find((r) => r.tipoRuta.startsWith('VIA') && (r.vuelo || r.fechaHoraSalida || r.fechaHoraLlegada));
    const dto: GuardarCoordinacionDto = {
      version: c.updatedAt.toISOString(),
      idGuiaMadre: c.idGuiaMadre,
      idConsignatario: c.idConsignatario!,
      idAgenciaIata: c.idAgenciaIata!,
      idDestinoAwb: c.idDestinoAwb!,
      idDestinoFinalDocs: c.idDestinoFinalDocs ?? undefined,
      idTipoEmbarque: c.idTipoEmbarque ?? undefined,
      pago: c.pago,
      fechaVuelo: c.fechaVuelo.toISOString().slice(0, 10),
      referencia: c.referencia ?? undefined,
      nota: c.nota ?? undefined,
      rutas: c.rutas.map((r) => ({
        tipoRuta: r.tipoRuta as TramoRutaDto['tipoRuta'],
        codigo: r.codigo ?? '',
        vuelo: r.vuelo ?? undefined,
        fechaHoraSalida: iso(r.fechaHoraSalida),
        fechaHoraLlegada: iso(r.fechaHoraLlegada),
      })),
      liquidacion: normal ? sinNulos(normal) : undefined,
      cobroCliente: extra ? sinNulos(extra) : undefined,
      vuelo:
        via || c.manifiesto
          ? {
              vuelo: via?.vuelo ?? undefined,
              salida: iso(via?.fechaHoraSalida ?? null),
              llegada: iso(via?.fechaHoraLlegada ?? null),
              numeroManifiesto: c.manifiesto?.numero ?? undefined,
              secuencial: c.manifiesto?.secuencial ?? undefined,
            }
          : undefined,
      lineas: c.guiaHijas.flatMap((g) =>
        g.detalles.map((d) => ({
          idLinea: d.id,
          idFinca: d.idFinca ?? g.idFinca,
          idProducto: d.idProducto!,
          idConsignatario: d.idConsignatario ?? g.idConsignatario ?? undefined,
          cantidadCajas: d.cantidadCajas,
          fulls: d.fulls ?? undefined,
          idTipoCaja: d.idTipoCaja ?? undefined,
          pesoKg: d.pesoKg ?? 0,
          tallos: d.tallos ?? undefined,
          valor: d.valor ?? undefined,
          dae: d.dae ?? g.dae ?? '',
          largo: d.largo ?? undefined,
          ancho: d.ancho ?? undefined,
          alto: d.alto ?? undefined,
          nota: d.nota ?? undefined,
          factura: d.factura ?? undefined,
        })),
      ),
    };
    return { dto, estado: c.estadoActual, codigoAccess: c.codigoAccess };
  }

  /** Corte de guía: irreversible. Deja la coordinación sin edición. */
  async cortar(id: number) {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: { guiaHijas: { include: { detalles: true } }, liquidaciones: true },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    asegurarEditable(c, `La coordinación ${c.numeroGuia ?? id}`);
    if (c.estadoActual !== 'BORRADOR') throw new ConflictException('Solo se corta una coordinación abierta.');
    if (c.guiaHijas.length === 0) throw new BadRequestException('No se puede cortar una guía sin guías hijas.');
    const sinDae = c.guiaHijas.flatMap((g) => g.detalles).filter((d) => !d.dae);
    if (sinDae.length) {
      throw new BadRequestException(
        sinDae.length === 1 ? 'Hay una fila sin DAE: la DAE es obligatoria.' : `Hay ${sinDae.length} filas sin DAE: la DAE es obligatoria.`,
      );
    }
    const normal = c.liquidaciones.find((l) => l.tipo === 'NORMAL');
    if (!normal?.pesoCobrable || !normal?.tarifa) {
      throw new BadRequestException('Falta el peso cobrable o la tarifa de la guía madre (los da la aerolínea).');
    }
    if (c.totalKgs !== null && normal.pesoCobrable < c.totalKgs) {
      // Las fincas pueden haber cargado después de que la oficina puso el peso cobrable.
      throw new BadRequestException(
        `El peso cobrable (${normal.pesoCobrable} kg) es menor que el peso de la carga (${c.totalKgs} kg): corrígelo antes de cortar.`,
      );
    }
    const cliente = c.corteExtra ? c.liquidaciones.find((l) => l.tipo === 'CORTE_EXTRA') : undefined;
    if (cliente && (!cliente.pesoCobrable || !cliente.tarifa)) {
      throw new BadRequestException('Falta el peso cobrable o la tarifa del cobro al cliente.');
    }
    const resumen = resumirLiquidacion(valores(cliente ?? normal));
    await this.db.documentoCoordinacion.update({
      where: { id },
      data: { estadoActual: 'CORTADO', ...camposResumen(resumen) },
    });
    return { id, estado: 'CORTADO' as const };
  }

  /**
   * Anular: como el sistema viejo, quita el detalle y libera la guía madre. El
   * viejo deja la cabecera con docEstado = 0 y quién / cuándo en dDocUsuario;
   * aquí queda en `CoordinacionAnulada` con el detalle tal como estaba.
   */
  async anular(id: number, usuario?: string, motivo?: string) {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: {
        liquidaciones: true,
        rutas: true,
        manifiesto: true,
        guiaHijas: { include: { detalles: true } },
      },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    asegurarEditable(c, `La coordinación ${c.numeroGuia ?? id}`);
    if (c.estadoActual === 'CORTADO') throw new ConflictException('Una guía cortada no se puede anular.');
    await this.db.$transaction(async (tx) => {
      await tx.coordinacionAnulada.create({
        data: {
          idDocumentoCoordinacion: c.id,
          numero: c.codigoAccess ?? c.numero,
          numeroGuia: c.numeroGuia,
          idConsignatario: c.idConsignatario,
          idAerolinea: c.idAerolinea,
          fechaVuelo: c.fechaVuelo,
          totalFulls: c.totalFulls,
          totalCajas: c.totalCajas,
          totalKgs: c.totalKgs,
          motivo: motivo?.trim() || null,
          anuladoPor: usuario ?? null,
          datos: JSON.parse(JSON.stringify(c)) as Prisma.InputJsonValue,
        },
      });
      await tx.documentoCoordinacion.delete({ where: { id } });
      const guia = await tx.guiaMadre.update({ where: { id: c.idGuiaMadre }, data: { estado: 'INGRESADA' } });
      await recalcularEstadoIngresos(tx, [guia.idDocumentoBase]);
    });
    return { id, anulada: true };
  }

  /**
   * Correcciones que se pueden hacer también después del corte (el corte fija
   * pesos y valores, no los datos de papeles): la factura y la nota de cada
   * línea y la nota de la guía. En el viejo la factura de la finca se escribía
   * en la grilla; las fincas a veces la mandan después de que la guía se cortó.
   */
  async corregir(id: number, dto: CorregirCoordinacionDto, usuario?: string) {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: { guiaHijas: { select: { numeroGuiaHija: true, detalles: { select: { id: true } } } } },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');
    asegurarEditable(c, `La coordinación ${c.numeroGuia ?? id}`);
    const propias = new Map(c.guiaHijas.flatMap((g) => g.detalles.map((d) => [d.id, g.numeroGuiaHija] as const)));
    for (const l of dto.lineas ?? []) {
      if (!propias.has(l.idLinea)) throw new BadRequestException(`La línea ${l.idLinea} no es de esta coordinación.`);
    }
    await this.db.$transaction(async (tx) => {
      for (const l of dto.lineas ?? []) {
        await tx.guiaHijaDetalle.update({
          where: { id: l.idLinea },
          data: {
            ...(l.factura !== undefined ? { factura: l.factura.trim() || propias.get(l.idLinea)! } : {}),
            ...(l.nota !== undefined ? { nota: l.nota.trim() || null } : {}),
          },
        });
      }
      await tx.documentoCoordinacion.update({
        where: { id },
        data: {
          ...(dto.nota !== undefined ? { nota: dto.nota.trim() || null } : {}),
          actualizadoPorLegacy: usuario ?? null,
          actualizadoEnLegacy: new Date(),
        },
      });
    });
    return { id };
  }

  /**
   * Pasar líneas (cajas de una finca) de una guía abierta a otra abierta, como
   * el asistente de transferencia del viejo (frmPINTransferWizard: "va a KAM").
   * Las dos guías se regraban en una sola transacción con sus guías hijas,
   * totales y liquidación recalculados; en la de destino las líneas quedan con
   * origen 'I' (como `detOrigen` de las transferidas en el viejo).
   */
  async transferir(idOrigen: number, dto: TransferirLineasDto, usuario?: string) {
    if (idOrigen === dto.idDestino) throw new BadRequestException('La guía de destino es la misma.');
    const [o, d] = await Promise.all([this.dtoDe(idOrigen), this.dtoDe(dto.idDestino)]);
    for (const [x, que] of [[o, 'origen'], [d, 'destino']] as const) {
      if (x.estado !== 'BORRADOR') throw new ConflictException(`La guía de ${que} ya fue cortada o anulada: no se le pueden pasar cajas.`);
      asegurarEditable({ codigoAccess: x.codigoAccess }, `La guía de ${que}`);
    }
    const ids = new Set(dto.idsLinea);
    const mover = o.dto.lineas.filter((l) => l.idLinea && ids.has(l.idLinea));
    if (mover.length !== ids.size) throw new BadRequestException('Alguna línea no es de la guía de origen.');
    const dtoOrigen: GuardarCoordinacionDto = { ...o.dto, lineas: o.dto.lineas.filter((l) => !l.idLinea || !ids.has(l.idLinea)) };
    const dtoDestino: GuardarCoordinacionDto = {
      ...d.dto,
      // Las cajas pasan a la marca de la guía de destino (como el viejo con InsertaMarcasAsociadas).
      lineas: [...d.dto.lineas, ...mover.map(({ idLinea: _id, idConsignatario: _c, ...l }) => l)],
    };
    const [actO, actD] = await Promise.all(
      [idOrigen, dto.idDestino].map((id) =>
        this.db.documentoCoordinacion.findUniqueOrThrow({ where: { id }, include: { guiaHijas: { include: { detalles: true } } } }),
      ),
    );
    const armadaO = await this.armar(dtoOrigen, await this.numerosExistentes(actO.guiaHijas), idOrigen, 'I');
    const armadaD = await this.armar(dtoDestino, await this.numerosExistentes(actD.guiaHijas), dto.idDestino, 'I');
    await this.db.$transaction(async (tx) => {
      for (const a of [actO, actD]) {
        const [fila] = await tx.$queryRaw<Array<{ updatedAt: Date }>>`
          SELECT "updatedAt" FROM "DocumentoCoordinacion" WHERE "id" = ${a.id} FOR UPDATE`;
        if (fila.updatedAt.getTime() !== a.updatedAt.getTime()) throw new CoordinacionCambiadaException();
      }
      await this.persistir(tx, idOrigen, dtoOrigen, armadaO, actO.idAerolinea, usuario);
      await this.persistir(tx, dto.idDestino, dtoDestino, armadaD, actD.idAerolinea, usuario, 'I');
    }, { timeout: 60_000 });
    return { idOrigen, idDestino: dto.idDestino, lineas: mover.length };
  }

  // ---------------------------------------------------------------------------

  private async guiaDisponible(id: number) {
    const guia = await this.db.guiaMadre.findUnique({ where: { id }, include: { documentoBase: true } });
    if (!guia) throw new BadRequestException('El campo número de guía es obligatorio.');
    asegurarEditable(guia.documentoBase, `La guía ${guia.numero}`);
    if (guia.estado === 'ANULADA' || guia.documentoBase.estado === 'ANULADO') {
      throw new ConflictException(`La guía ${guia.numero} está anulada.`);
    }
    if (guia.estado !== 'INGRESADA') throw new ConflictException(
        guia.estado === 'COORDINADA'
          ? `La guía ${guia.numero} ya está coordinada.`
          : `La guía ${guia.numero} está prestada a otra agencia.`,
      );
    return guia;
  }

  /**
   * Valida, agrupa en guías hijas, totaliza y liquida. No escribe nada.
   * `origen` 'E' (la finca carga por el portal): el peso cobrable de la oficina
   * no frena su carga, como en la web vieja; se exige al grabar en la oficina y
   * al cortar.
   */
  private async armar(
    dto: GuardarCoordinacionDto,
    numeros: Map<string, string>,
    idActual?: number,
    origen?: string,
  ): Promise<CoordinacionArmada> {
    if (!dto.fechaVuelo) throw new BadRequestException('El campo fecha es obligatorio.');
    const advertencias: string[] = [];
    const guia = await this.db.guiaMadre.findUnique({
      where: { id: dto.idGuiaMadre },
      select: { idAerolinea: true, numero: true, documentoBase: { select: { idAgenciaIata: true } } },
    });
    if (!guia) throw new BadRequestException('El campo número de guía es obligatorio.');
    // Regla de la Asignación del sistema viejo: la guía se reservó con una agencia IATA (referencia del ingreso).
    const agenciaGuia = guia.documentoBase.idAgenciaIata;
    if (agenciaGuia && dto.idAgenciaIata && agenciaGuia !== dto.idAgenciaIata) {
      const ags = await this.maestros.agenciaIata.findMany({
        where: { id: { in: [agenciaGuia, dto.idAgenciaIata] } },
        select: { id: true, alias: true, nombreShipper: true },
      });
      const nombre = (x: number) => {
        const a = ags.find((y) => y.id === x);
        return a ? a.alias || a.nombreShipper : 'otra';
      };
      advertencias.push(
        `La guía se ingresó con la agencia IATA ${nombre(agenciaGuia)} y la coordinación tiene ${nombre(dto.idAgenciaIata)}.`,
      );
    }

    const productos = new Map(
      (
        await this.maestros.producto.findMany({
          where: { id: { in: [...new Set(dto.lineas.map((l) => l.idProducto))] } },
          select: { id: true, codigo: true },
        })
      ).map((p) => [p.id, p.codigo]),
    );
    const tipos = new Map(
      (await this.db.tipoCaja.findMany()).map((t) => [t.id, t.factorFull]),
    );
    const porProducto = await this.ngHPorProducto();
    // Nombre corto de la finca (alias del sistema viejo) para los mensajes.
    const fincas = new Map(
      (
        await this.maestros.finca.findMany({
          where: { id: { in: [...new Set(dto.lineas.map((l) => l.idFinca))] } },
          select: { id: true, nombreFinca: true, tag: true },
        })
      ).map((f) => [f.id, f.tag?.trim() || f.nombreFinca]),
    );
    const fila = (i: number, idFinca: number) => `Fila ${i + 1} (${fincas.get(idFinca) ?? 'finca'})`;

    const lineas: LineaPreparada[] = dto.lineas.map((l, i) => {
      if (!productos.has(l.idProducto)) throw new BadRequestException(`${fila(i, l.idFinca)}: el producto no existe.`);
      const dae = l.dae?.trim();
      if (!dae) throw new BadRequestException(`${fila(i, l.idFinca)}: falta la DAE.`);
      if (!PATRON_DAE.test(dae)) advertencias.push(`${fila(i, l.idFinca)}: la DAE "${dae}" no tiene el formato 055-AAAA-40-XXXXXXXX.`);
      if (!(l.pesoKg >= 0)) throw new BadRequestException(`${fila(i, l.idFinca)}: el peso (kg) debe ser un número.`);
      const factor = l.idTipoCaja ? tipos.get(l.idTipoCaja) : undefined;
      const fulls = l.fulls ?? (factor !== undefined ? r6(l.cantidadCajas * factor) : 0);
      return {
        ...l,
        dae,
        idConsignatario: l.idConsignatario ?? dto.idConsignatario,
        codigoProducto: productos.get(l.idProducto) ?? null,
        fullsCalculados: fulls,
      };
    });

    const grupos = agruparEnGuiasHijas(
      lineas.map((l) => ({ ...l, fulls: l.fullsCalculados })),
      porProducto,
    );
    // Número de cada guía hija: el que ya tenía (misma marca + finca + producto); si cambió la marca de
    // la guía, el de la misma finca + producto (el viejo conserva los HAWB: InsertaMarcasAsociadas).
    const asignados = new Map<string, string>();
    const usados = new Set<string>();
    for (const clave of grupos.keys()) {
      const n = numeros.get(clave);
      if (n) {
        asignados.set(clave, n);
        usados.add(n);
      }
    }
    for (const [clave, ls] of grupos) {
      if (asignados.has(clave)) continue;
      const n = numeros.get(claveSinMarca(ls[0], porProducto));
      if (n && !usados.has(n)) {
        asignados.set(clave, n);
        usados.add(n);
      }
    }
    const guiasHijas = [...grupos.entries()].map(([clave, ls]) => {
      const t = totalesDeLineas(ls);
      const daes = new Set(ls.map((l) => l.dae));
      if (daes.size > 1) advertencias.push(`La guía hija de ${fincas.get(ls[0].idFinca) ?? 'una finca'} tiene ${daes.size} DAE distintas.`);
      return {
        clave,
        numeroGuiaHija: asignados.get(clave) ?? null,
        idFinca: ls[0].idFinca,
        idConsignatario: ls[0].idConsignatario,
        dae: ls[0].dae,
        pesoBruto: t.kgs,
        totalPiezas: t.cajas,
        totalFulls: t.fulls,
        lineas: ls as LineaPreparada[],
      };
    });
    const conFulls = lineas.map((l) => ({ ...l, fulls: l.fullsCalculados }));
    const totales = { ...totalesDeLineas(conFulls), volumen: volumenDeLineas(conFulls) };

    const v = valores(dto.liquidacion ?? {});
    // La finca por el portal ('E') y las transferencias ('I') no se frenan: el peso cobrable se exige al
    // grabar en la oficina y al cortar.
    if (v.pesoCobrable !== null && v.pesoCobrable < totales.kgs && origen !== 'E' && origen !== 'I') {
      // Regla del sistema viejo: "El Peso Volumen ingresado NO puede ser menor que el Peso Neto".
      throw new BadRequestException(
        `El peso cobrable (${v.pesoCobrable} kg) no puede ser menor que el peso de la carga (${totales.kgs} kg).`,
      );
    }
    if (v.pesoCobrable !== null && !Number.isInteger(v.pesoCobrable)) {
      advertencias.push('El peso cobrable suele ser un número entero de kg.');
    }
    // En el histórico el cobrable es 1.00–1.15 × el bruto (o el mínimo de 100 kg en guías chicas); muy
    // por encima suele ser un cero de más (coordinación 13003: 8 800 kg cobrables para 880 kg brutos).
    if (v.pesoCobrable !== null && totales.kgs > 0 && v.pesoCobrable > 100 && v.pesoCobrable > totales.kgs * 2) {
      advertencias.push(
        `El peso cobrable (${v.pesoCobrable} kg) es ${(v.pesoCobrable / totales.kgs).toFixed(1)} veces el peso de la carga: revísalo.`,
      );
    }

    // Cobro al cliente: el sistema viejo no lo valida contra el peso bruto.
    const vc = dto.cobroCliente ? valores(dto.cobroCliente) : null;
    const resumen = resumirLiquidacion(v);
    const resumenCliente = vc ? resumirLiquidacion(vc) : null;
    const resta = (a: number | null | undefined, b: number | null | undefined) =>
      a === null || a === undefined || b === null || b === undefined ? null : r2(a - b);
    const diferencia = resumenCliente
      ? {
          tarifa: resta(resumenCliente.tarifa, resumen.tarifa),
          flete: resta(resumenCliente.flete, resumen.flete),
          total: resta(resumenCliente.total, resumen.total),
        }
      : null;
    if (diferencia?.tarifa !== null && diferencia?.tarifa !== undefined && diferencia.tarifa < 0) {
      advertencias.push(
        `La tarifa al cliente (${resumenCliente!.tarifa}) es menor que la de la aerolínea (${resumen.tarifa}).`,
      );
    }

    const aerolinea = guia.idAerolinea ? await this.conceptosAerolinea(guia.idAerolinea) : null;
    let sugerida: Partial<ValoresLiquidacion> = {};
    if (aerolinea) {
      sugerida = { tarifa: aerolinea.tarifa, ...defaultsAerolinea(aerolinea.conceptos, totales.kgs, v.pesoCobrable) };
      // R8: PCA = (flete + cargos aerolínea) × % de la aerolínea (hoy todas en 0).
      if (aerolinea.pca && resumen.flete !== null) {
        sugerida.cargoPca = r2((resumen.flete + resumen.dueCarrier) * aerolinea.pca);
      }
    }
    // Handling al cliente = el de la ficha del cliente de la marca (97–100 % de las guías por año).
    const marca = await this.maestros.consignatario.findUnique({
      where: { id: dto.idConsignatario },
      select: { cliente: { select: { handling: true } } },
    });
    if (marca?.cliente?.handling) sugerida.aux3Handling = marca.cliente.handling;

    return {
      guiasHijas,
      totales,
      liquidacion: resumenCliente ?? resumen,
      aerolinea: resumen,
      cliente: resumenCliente,
      diferencia,
      sugerida,
      sugeridaCliente: await this.ultimoCobroCliente(dto.idConsignatario, idActual),
      advertencias,
    };
  }

  /** Cobro al cliente de la última guía (con cobro distinto) de la misma marca. */
  private async ultimoCobroCliente(idConsignatario: number, idActual?: number): Promise<CoordinacionArmada['sugeridaCliente']> {
    const ultima = await this.db.documentoCoordinacion.findFirst({
      where: {
        idConsignatario,
        corteExtra: true,
        estadoActual: { not: 'ANULADO' },
        ...(idActual ? { id: { not: idActual } } : {}),
      },
      orderBy: [{ fechaVuelo: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        numeroGuia: true,
        fechaVuelo: true,
        liquidaciones: { where: { tipo: 'CORTE_EXTRA' } },
      },
    });
    const l = ultima?.liquidaciones[0];
    if (!ultima || !l) return null;
    const valores: Partial<ValoresLiquidacion> = {};
    for (const k of CAMPOS_COBRO_CLIENTE) {
      if (l[k] !== null && l[k] !== 0) valores[k] = l[k];
    }
    return {
      valores,
      desde: { id: ultima.id, numeroGuia: ultima.numeroGuia, fechaVuelo: ultima.fechaVuelo.toISOString().slice(0, 10) },
    };
  }

  private async conceptosAerolinea(idAerolinea: number): Promise<NonNullable<ParametrosCoordinacion['aerolinea']>> {
    const pl = await this.maestros.aerolineasPlantilla.findUnique({
      where: { idAerolinea },
      include: { conceptos: true },
    });
    return {
      id: idAerolinea,
      tarifa: pl?.tarifaRate ?? null,
      pca: pl?.pca ?? null,
      conceptos: (pl?.conceptos ?? [])
        .filter((c) => CAMPO_CONCEPTO[c.tipo])
        .map((c) => ({
          campo: CAMPO_CONCEPTO[c.tipo],
          abreviatura: c.abreviatura,
          valor: c.valor,
          porPeso: c.multiplicador !== null,
          sobrePesoCobrable: c.multiplicador === 'CHARGEABLE_WEIGHT',
        })),
    };
  }

  /**
   * Números de guía hija que ya tiene la coordinación, por su clave (marca +
   * finca + producto) y por finca + producto sin la marca (para conservarlos si
   * cambia la marca; solo si esa finca + producto tenía una sola guía hija).
   */
  private async numerosExistentes(
    guias: Array<{ numeroGuiaHija: string; detalles: LineaCalculo[] }>,
  ): Promise<Map<string, string>> {
    const porProducto = await this.ngHPorProducto();
    const numeros = new Map<string, string>();
    const sinMarca = new Map<string, string[]>();
    for (const g of guias) {
      if (!g.detalles[0]) continue;
      numeros.set(claveGuiaHija(g.detalles[0], porProducto), g.numeroGuiaHija);
      const k = claveSinMarca(g.detalles[0], porProducto);
      sinMarca.set(k, [...(sinMarca.get(k) ?? []), g.numeroGuiaHija]);
    }
    for (const [k, ns] of sinMarca) if (ns.length === 1) numeros.set(k, ns[0]);
    return numeros;
  }

  /** `_PIN_MParams.parNGHxProducto`: si la guía hija se separa por producto (default sí). */
  private async ngHPorProducto(): Promise<boolean> {
    const p = await this.maestros.parametro.findUnique({ where: { clave: 'MPARAMS.parNGHxProducto' } });
    return p?.valorNumero === null || p?.valorNumero === undefined ? true : p.valorNumero !== 0;
  }

  /** Guarda la coordinación armada (crea o reemplaza hijos). Devuelve el id. */
  private async persistir(
    tx: Prisma.TransactionClient,
    id: number | null,
    dto: GuardarCoordinacionDto,
    a: CoordinacionArmada,
    idAerolinea: number | null,
    usuario?: string,
    origen?: string,
  ): Promise<number> {
    const guia = await tx.guiaMadre.findUniqueOrThrow({ where: { id: dto.idGuiaMadre } });
    const v = valores(dto.liquidacion ?? {});
    const agencia = await this.maestros.agenciaIata.findUnique({ where: { id: dto.idAgenciaIata }, select: { comision: true } });
    const ahora = new Date();
    const base = {
      idGuiaMadre: dto.idGuiaMadre,
      numeroGuia: guia.numero ? `${guia.numero.slice(0, 8)} ${guia.numero.slice(8)}` : null,
      idAerolinea,
      idConsignatario: dto.idConsignatario,
      idAgenciaIata: dto.idAgenciaIata,
      idDestinoAwb: dto.idDestinoAwb,
      idDestinoFinalDocs: dto.idDestinoFinalDocs ?? dto.idDestinoAwb,
      idTipoEmbarque: dto.idTipoEmbarque ?? null,
      pago: dto.pago,
      fechaVuelo: dia(dto.fechaVuelo),
      referencia: dto.referencia ?? null,
      nota: dto.nota ?? null,
      tarifaRate: v.tarifa ?? 0,
      totalFulls: a.totales.fulls,
      totalCajas: a.totales.cajas,
      totalKgs: a.totales.kgs,
      totalVolumen: a.totales.volumen,
      // Como Proc_6FFFF0: la liquidación guarda los totales físicos y la comisión de la agencia.
      liqFulls: a.totales.fulls,
      liqPiezas: Math.round(a.totales.cajas),
      liqPesoBruto: a.totales.kgs,
      corteExtra: !!dto.cobroCliente,
      ...camposResumen(a.liquidacion),
      // R14: la comisión es la de la agencia IATA (shiComision); hoy no se usa, pero el viejo la guarda siempre.
      comision: agencia?.comision ?? null,
      // Quién y cuándo modificó (dDocUsuario.docUsuAct / docFecAct del viejo).
      actualizadoPorLegacy: usuario ?? null,
      actualizadoEnLegacy: ahora,
    };
    let coordId: number;
    const registros = new Map<number, { usuario: string | null; fechaRegistro: Date | null; origen: string | null }>();
    if (id === null) {
      coordId = (
        await tx.documentoCoordinacion.create({
          data: {
            ...base,
            numero: await siguiente(tx, 'coordinacion', inicioCoordinacion()),
            estadoActual: 'BORRADOR',
            fechaAsignacion: ahora,
            creadoPorLegacy: usuario ?? null,
            creadoEnLegacy: ahora,
          },
          select: { id: true },
        })
      ).id;
    } else {
      await tx.documentoCoordinacion.update({ where: { id }, data: base });
      coordId = id;
      const w = { where: { idDocumentoCoordinacion: id } };
      // Quién y cuándo registró cada línea (la finca por la web o la oficina) no cambia al regrabar.
      for (const d of await tx.guiaHijaDetalle.findMany({
        where: { guiaHija: { idDocumentoCoordinacion: id } },
        select: { id: true, usuario: true, fechaRegistro: true, origen: true },
      })) {
        registros.set(d.id, d);
      }
      await tx.guiaHija.deleteMany(w);
      await tx.documentoRuta.deleteMany(w);
      await tx.documentoManifiesto.deleteMany(w);
      await tx.documentoLiquidacion.deleteMany(w);
    }

    await tx.documentoLiquidacion.create({ data: { idDocumentoCoordinacion: coordId, tipo: 'NORMAL', ...v } });
    if (dto.cobroCliente) {
      // Access guarda el cobro al cliente como "corte extra" (campos *_ex); el handling al cliente va en el normal.
      const { aux3Handling: _h, auxOtros: _o, tarifaAcordada: _t, ...cliente } = valores(dto.cobroCliente);
      await tx.documentoLiquidacion.create({
        data: { idDocumentoCoordinacion: coordId, tipo: 'CORTE_EXTRA', ...cliente },
      });
    }
    const rutas = [...(dto.rutas?.length ? dto.rutas : await this.rutaDeAerolinea(idAerolinea))];
    const vm = dto.vuelo;
    const codigoAerolinea = idAerolinea
      ? ((await this.maestros.aerolinea.findUnique({ where: { id: idAerolinea }, select: { codigo: true } }))?.codigo ?? null)
      : null;
    if (vm?.vuelo || vm?.salida || vm?.llegada) {
      // Como el sistema viejo: el vuelo va en el tramo VIA (la aerolínea que lo opera).
      let via = rutas.findIndex((r) => r.tipoRuta.startsWith('VIA'));
      if (via < 0) {
        rutas.push({ tipoRuta: 'VIA1', codigo: codigoAerolinea ?? '' });
        via = rutas.length - 1;
      }
      rutas[via] = { ...rutas[via], vuelo: vm.vuelo, fechaHoraSalida: vm.salida, fechaHoraLlegada: vm.llegada };
    }
    // El manifiesto es del transportista que opera el vuelo (tramo VIA), que puede no ser la aerolínea de la
    // guía: las de MSC (CP) vuelan con Atlas (5Y).
    const transportista =
      rutas.find((r) => r.tipoRuta.startsWith('VIA') && r.vuelo)?.codigo?.trim() ||
      rutas.find((r) => r.tipoRuta.startsWith('VIA'))?.codigo?.trim() ||
      codigoAerolinea;
    if (rutas.length) {
      await tx.documentoRuta.createMany({
        data: rutas.map((r, i) => ({
          idDocumentoCoordinacion: coordId,
          tipoRuta: r.tipoRuta,
          codigo: r.codigo,
          orden: i + 1,
          vuelo: r.vuelo ?? null,
          fechaHoraSalida: r.fechaHoraSalida ? new Date(r.fechaHoraSalida) : null,
          fechaHoraLlegada: r.fechaHoraLlegada ? new Date(r.fechaHoraLlegada) : null,
        })),
      });
    }

    const anio = dia(dto.fechaVuelo).getUTCFullYear();
    if (vm?.numeroManifiesto || vm?.secuencial) {
      const numero = vm.numeroManifiesto?.padStart(6, '0') ?? null;
      const secuencial = vm.secuencial?.padStart(4, '0') ?? null;
      const llegada = vm.llegada ? new Date(vm.llegada) : null;
      await tx.documentoManifiesto.create({
        data: {
          idDocumentoCoordinacion: coordId,
          origen: rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo || 'UIO',
          aduana: '055',
          anio: String(anio),
          tipo: transportista,
          numero,
          secuencial,
          vuelo: vm.vuelo ?? null,
          // Como los guarda el sistema viejo: fecha y hora locales de llegada.
          fechaArribo: llegada ? horaLocal(llegada).fecha : null,
          horaArribo: llegada ? horaLocal(llegada).hora : null,
          referencia: ['CEC', anio, transportista ?? '', numero ?? '', secuencial ?? ''].join('-'),
        },
      });
    }
    for (const g of a.guiasHijas) {
      const numero = g.numeroGuiaHija ?? String(await siguiente(tx, 'guiaHija', inicioGuiaHija()));
      await tx.guiaHija.create({
        data: {
          idDocumentoCoordinacion: coordId,
          idGuiaMadre: dto.idGuiaMadre,
          idFinca: g.idFinca,
          idConsignatario: g.idConsignatario,
          numeroGuiaHija: numero,
          anio,
          secuencial: Number(numero),
          dae: g.dae,
          pesoBruto: g.pesoBruto,
          totalPiezas: g.totalPiezas,
          totalFulls: g.totalFulls,
          detalles: {
            createMany: {
              data: g.lineas.map((l, i) => ({
                numeroLinea: i + 1,
                idProducto: l.idProducto,
                codigoProducto: l.codigoProducto,
                idFinca: l.idFinca,
                idConsignatario: l.idConsignatario,
                idTipoCaja: l.idTipoCaja ?? null,
                cantidadCajas: l.cantidadCajas,
                fulls: l.fullsCalculados,
                pesoKg: l.pesoKg,
                tallos: l.tallos ?? null,
                valor: l.valor ?? null,
                dae: l.dae,
                largo: l.largo ?? null,
                ancho: l.ancho ?? null,
                alto: l.alto ?? null,
                nota: l.nota ?? null,
                // Sin factura de la finca, la factura es el número de guía hija (así queda en el 80 % de
                // las líneas del viejo hasta 2026-05).
                factura: l.factura?.trim() || numero,
                ...((l.idLinea && registros.get(l.idLinea)) || { usuario: usuario ?? null, fechaRegistro: ahora, origen: origen ?? null }),
              })),
            },
          },
        },
      });
    }
    return coordId;
  }

  /** Ruta por defecto de la aerolínea (datos maestros) como tramos de la coordinación. */
  private async rutaDeAerolinea(idAerolinea: number | null): Promise<TramoRutaDto[]> {
    if (!idAerolinea) return [];
    const rutas = await this.maestros.aerolineaRuta.findMany({
      where: { aerolineaId: idAerolinea },
      orderBy: { orden: 'asc' },
      include: { origen: true, destino: true, viaAerolinea: true },
    });
    return rutas
      .map((r) => ({
        tipoRuta: r.tipoRuta,
        codigo: r.origen?.codigo ?? r.destino?.codigo ?? r.viaAerolinea?.codigo ?? '',
      }))
      .filter((r) => r.codigo);
  }
}

/** Finca + producto, sin la marca: para conservar el número de guía hija si cambia la marca. */
function claveSinMarca(l: LineaCalculo, porProducto: boolean): string {
  return ['sinMarca', l.idFinca ?? '-', porProducto ? (l.codigoProducto ?? '-') : ''].join('|');
}

/** Fecha ("2022/09/15") y hora ("10:11") de Ecuador, como el manifiesto del sistema viejo. */
function horaLocal(d: Date): { fecha: string; hora: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { fecha: `${p.year}/${p.month}/${p.day}`, hora: `${p.hour}:${p.minute}` };
}

/** DTO de valores → todos los conceptos con null cuando faltan. */
function valores(v: Partial<ValoresLiquidacionDto> | Record<string, unknown>): ValoresLiquidacion {
  const n = (k: string) => {
    const x = (v as Record<string, unknown>)[k];
    return typeof x === 'number' && Number.isFinite(x) ? x : null;
  };
  const out: ValoresLiquidacion = {
    pesoCobrable: n('pesoCobrable'),
    tarifa: n('tarifa'),
    guiaAerea: n('guiaAerea'),
    combustible: n('combustible'),
    seguridad: n('seguridad'),
    otros: n('otros'),
    iva: n('iva'),
    handling: n('handling'),
    cargoAwa: n('cargoAwa'),
    cargoCha: n('cargoCha'),
    cargoPca: n('cargoPca'),
    cargoTax: n('cargoTax'),
    cargoMma: n('cargoMma'),
    cargoHawb: n('cargoHawb'),
    cargoFitos: n('cargoFitos'),
    aux1: n('aux1'),
    aux2: n('aux2'),
    aux3Handling: n('aux3Handling'),
    calAux: n('calAux'),
    auxOtros: n('auxOtros'),
    tarifaAcordada: n('tarifaAcordada'),
  };
  // extHandling = Σ códigos de agencia: no se digita, se calcula (R5).
  out.handling = cargosAgencia(out);
  return out;
}

function camposResumen(r: ReturnType<typeof resumirLiquidacion>) {
  return {
    liqPesoCobrable: r.pesoCobrable,
    liqTarifa: r.tarifa,
    liqFlete: r.flete,
    liqDueCarrier: r.dueCarrier,
    liqDueAgent: r.dueAgent,
    liqTotal: r.total,
  };
}
