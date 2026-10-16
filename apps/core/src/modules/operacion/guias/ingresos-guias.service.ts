import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { LegacyDbService } from '../../integrations/legacy-db/legacy-db.service';
import { siguiente } from '../comun/contadores';
import { asegurarEditable, modoOperacion } from '../comun/modo-operacion';
import { NombresMaestrosService, ref, RefMaestro } from '../maestros/nombres-maestros.service';
import { awbClave, awbTexto, parsearSerial } from './awb';
import { GuardarIngresoDto, ListarIngresosDto } from './dto/ingreso-guias.dto';
import { estadoSegunGuias, recalcularEstadoIngresos } from './estado-ingreso';

type EstadoIngreso = 'ANULADO' | 'INGRESADO' | 'GUIAS_COORDINADAS' | 'CANCELADO';
type EstadoGuia = 'INGRESADA' | 'COORDINADA' | 'PRESTADA' | 'ANULADA';

export interface GuiaDeIngreso {
  id: number;
  numero: string | null;
  estado: EstadoGuia | null;
  virtual: boolean;
  prestada: boolean;
  devuelta: boolean;
  fechaPrestamo: string | null;
  fechaDevolucion: string | null;
  observaciones: string | null;
  /** Coordinación que la usa (N° del sistema viejo o id de la nueva). */
  coordinacion: { id: number | null; numero: number; fechaVuelo: string | null } | null;
}

export interface IngresoResumen {
  id: number;
  /** N° del documento (CGU-0003871). */
  numero: number | null;
  origen: 'ACCESS' | 'SISTEMA';
  fecha: string | null;
  aerolinea: RefMaestro | null;
  agencia: RefMaestro | null;
  referencia: string | null;
  tipoStock: 'NORMAL' | 'VIRTUAL' | null;
  estado: EstadoIngreso | null;
  guias: GuiaDeIngreso[];
}

export interface IngresoDetalle extends IngresoResumen {
  nota: string | null;
  conteo: { total: number; libres: number; coordinadas: number; prestamos: number; devoluciones: number; anuladas: number };
  /** Estado que corresponde a sus guías; "stock verificado" = coincide con el guardado. */
  estadoCalculado: EstadoIngreso | null;
  verificado: boolean;
  editable: boolean;
  auditoria: { creadoPor: string | null; creadoEn: string | null; actualizadoPor: string | null; actualizadoEn: string | null };
  /** Documento anterior / siguiente por N° (los botones Anterior y Siguiente del sistema viejo). */
  anterior: { id: number; numero: number } | null;
  siguiente: { id: number; numero: number } | null;
}

export interface PrevisualizacionIngreso {
  aerolinea: { id: number; nombre: string; codigo: string | null; prefijo: string };
  guias: Array<{ entrada: string; numero: string | null; texto: string | null; problema: string | null }>;
  /** false si no se pudo consultar el sistema viejo (el bridge no respondió). */
  revisadoSistemaViejo: boolean;
  ok: boolean;
}

const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const fechaDe = (s?: string) =>
  s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

/** "CGU-0003871", como lo imprime el sistema viejo. */
export const textoIngreso = (n: number | null | undefined) => (n ? `CGU-${String(n).padStart(7, '0')}` : 'el ingreso');

/**
 * Primer N° de ingreso del sistema nuevo. En modo sombra un rango propio
 * (900.000) para no chocar con el contador del sistema viejo (~3.900 hoy); al
 * pasar a modo activo, OPERACION_CGU_INICIO = MAX(docNumero) de Access + 1.
 */
export function inicioIngreso(): number {
  const n = parseInt(process.env.OPERACION_CGU_INICIO || '', 10);
  if (Number.isFinite(n) && n > 0) return n;
  return modoOperacion() === 'sombra' ? 900_000 : 1;
}

const includeGuias = {
  guiasMadre: {
    orderBy: [{ prefijo: 'asc' as const }, { secuencial: 'asc' as const }],
    include: { documentoCoordinacion: { select: { id: true, codigoAccess: true, fechaVuelo: true } } },
  },
} satisfies Prisma.DocumentoBaseInclude;

type DocConGuias = Prisma.DocumentoBaseGetPayload<{ include: typeof includeGuias }>;

/**
 * Ingreso de guías: el documento con el que nace cada guía AWB (menú del
 * sistema viejo Documentos › Guías › Ingreso, `frmPIN_CoorGuias`, docTipo CGU).
 * Tiene número, fecha, aerolínea, referencia (agencia IATA con que se reservó),
 * tipo de stock y estado; hoy casi siempre trae una sola guía virtual.
 */
@Injectable()
export class IngresosGuiasService {
  private readonly logger = new Logger(IngresosGuiasService.name);

  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
    private readonly nombres: NombresMaestrosService,
    private readonly legacy: LegacyDbService,
  ) {}

  async listar(f: ListarIngresosDto) {
    const page = f.page ?? 1;
    const pageSize = f.pageSize ?? 50;
    const and: Prisma.DocumentoBaseWhereInput[] = [];
    const pestana = f.pestana ?? 'todos';
    if (pestana === 'todos') and.push({ OR: [{ estado: null }, { estado: { not: 'ANULADO' } }] });
    if (pestana === 'activos') and.push({ estado: { in: ['INGRESADO', 'GUIAS_COORDINADAS'] } });
    if (pestana === 'cancelados') and.push({ estado: 'CANCELADO' });
    if (pestana === 'anulados') and.push({ estado: 'ANULADO' });
    if (f.idAerolinea) and.push({ idAerolinea: f.idAerolinea });
    const q = f.q?.trim();
    if (q) {
      const digitos = q.replace(/\D/g, '');
      const or: Prisma.DocumentoBaseWhereInput[] = [];
      if (/^(cgu[-\s]?)?\d{1,7}$/i.test(q)) or.push({ numero: Number(digitos) });
      if (digitos.length >= 4) {
        const numero = digitos.length === 11 ? `${digitos.slice(0, 3)}-${digitos.slice(3)}` : digitos;
        or.push({ guiasMadre: { some: { numero: { contains: numero } } } });
      }
      if (/[a-zñ]/i.test(q)) {
        const ins = { contains: q, mode: 'insensitive' as const };
        or.push({ referencia: ins }, { nota: ins }, { guiasMadre: { some: { observaciones: ins } } });
      }
      and.push(or.length ? { OR: or } : { id: -1 });
    }
    const where: Prisma.DocumentoBaseWhereInput = and.length ? { AND: and } : {};
    const [total, docs] = await Promise.all([
      this.db.documentoBase.count({ where }),
      this.db.documentoBase.findMany({
        where,
        include: includeGuias,
        orderBy: [{ fecha: { sort: 'desc', nulls: 'last' } }, { numero: { sort: 'desc', nulls: 'last' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const refs = await this.nombres.resolver({
      aerolineas: docs.map((d) => d.idAerolinea),
      agencias: docs.map((d) => d.idAgenciaIata),
    });
    return { items: docs.map((d) => this.resumen(d, refs)), total, page, pageSize };
  }

  async detalle(id: number): Promise<IngresoDetalle> {
    const d = await this.db.documentoBase.findUnique({ where: { id }, include: includeGuias });
    if (!d) throw new NotFoundException('El ingreso de guías no existe.');
    const refs = await this.nombres.resolver({ aerolineas: [d.idAerolinea], agencias: [d.idAgenciaIata] });
    const r = this.resumen(d, refs);
    const vigentes = d.guiasMadre.filter((g) => g.estado !== 'ANULADA');
    const estadoCalculado = d.estado === 'ANULADO' ? 'ANULADO' : estadoSegunGuias(d.guiasMadre);
    // Como la lista vieja, se navega sin los anulados (salvo que se esté viendo uno).
    const vecino = (lado: 'anterior' | 'siguiente') =>
      d.numero === null
        ? null
        : this.db.documentoBase.findFirst({
            where: {
              numero: lado === 'anterior' ? { lt: d.numero } : { gt: d.numero },
              ...(d.estado === 'ANULADO' ? {} : { OR: [{ estado: null }, { estado: { not: 'ANULADO' } }] }),
            },
            orderBy: { numero: lado === 'anterior' ? 'desc' : 'asc' },
            select: { id: true, numero: true },
          });
    const [anterior, siguiente] = await Promise.all([vecino('anterior'), vecino('siguiente')]);
    return {
      ...r,
      nota: d.nota,
      conteo: {
        total: vigentes.length,
        libres: vigentes.filter((g) => g.estado === 'INGRESADA').length,
        coordinadas: vigentes.filter((g) => g.estado === 'COORDINADA').length,
        prestamos: vigentes.filter((g) => g.estado === 'PRESTADA').length,
        devoluciones: vigentes.filter((g) => g.devolucion).length,
        anuladas: d.guiasMadre.length - vigentes.length,
      },
      estadoCalculado,
      verificado: d.estado === estadoCalculado,
      editable: d.codigoAccess === null || modoOperacion() === 'activo',
      auditoria: {
        creadoPor: d.creadoPorLegacy,
        creadoEn: iso(d.creadoEnLegacy ?? d.createdAt),
        actualizadoPor: d.actualizadoPorLegacy,
        actualizadoEn: iso(d.actualizadoEnLegacy ?? (d.codigoAccess === null ? d.updatedAt : null)),
      },
      anterior: anterior?.numero != null ? { id: anterior.id, numero: anterior.numero } : null,
      siguiente: siguiente?.numero != null ? { id: siguiente.id, numero: siguiente.numero } : null,
    };
  }

  /**
   * Revisa las guías sin grabar: formato (8 dígitos, verificador serial mod 7),
   * repetidas en la lista, ya ingresadas en el sistema nuevo o en el viejo
   * (consulta en vivo, solo lectura).
   */
  async previsualizar(dto: GuardarIngresoDto, idActual?: number): Promise<PrevisualizacionIngreso> {
    const aerolinea = await this.maestros.aerolinea.findUnique({
      where: { id: dto.idAerolinea },
      select: { id: true, nombre: true, alias: true, codigo: true, prefijoAwb: true },
    });
    if (!aerolinea) throw new NotFoundException('Aerolínea no encontrada.');
    const prefijo = aerolinea.prefijoAwb?.trim() ?? '';
    if (!/^\d{3}$/.test(prefijo)) {
      throw new BadRequestException(`La aerolínea ${aerolinea.nombre} no tiene un prefijo de guía numérico de 3 dígitos.`);
    }

    const vistas = new Set<string>();
    const guias = dto.guias.map((entrada) => {
      // Se acepta el número con prefijo ("369-8469 5461") si es el de la aerolínea.
      let d = entrada.replace(/\D/g, '');
      if (d.length === 11 && d.startsWith(prefijo)) d = d.slice(3);
      const { serial, error } = parsearSerial(d);
      if (error) return { entrada, numero: null, texto: null, problema: error };
      const awb = { prefijo: Number(prefijo), serial, verificador: serial % 7 };
      const numero = awbClave(awb);
      const problema = vistas.has(numero) ? 'Está repetida en la lista.' : null;
      vistas.add(numero);
      return { entrada, numero, texto: awbTexto(awb), problema };
    });

    const numeros = guias.map((g) => g.numero).filter((x): x is string => !!x);
    const existentes = await this.db.guiaMadre.findMany({
      where: { numero: { in: numeros }, estado: { not: 'ANULADA' }, ...(idActual ? { idDocumentoBase: { not: idActual } } : {}) },
      select: { numero: true, documentoBase: { select: { numero: true } } },
    });
    const enNuevo = new Map(existentes.map((e) => [e.numero!, e.documentoBase.numero]));

    // Sistema viejo, en vivo: lo que se ingresó allá y el sync todavía no trajo.
    const enViejo = new Map<string, number>();
    let revisadoSistemaViejo = true;
    const textos = guias.map((g) => g.texto).filter((x): x is string => !!x && /^\d{3}-\d{4} \d{4}$/.test(x));
    if (textos.length) {
      try {
        const filas = await this.legacy.queryBridge<{ guiNumero: string; docNumero: number }>(
          `SELECT guiNumero, docNumero FROM PIN_DCoorGuias WHERE docTipo = 'CGU' AND guiNumero IN (${textos.map((t) => `'${t}'`).join(', ')})`,
        );
        for (const f of filas) enViejo.set(String(f.guiNumero).replace(/\s+/g, ''), Number(f.docNumero));
      } catch (e) {
        revisadoSistemaViejo = false;
        this.logger.warn(`No se pudo revisar el sistema viejo: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const conProblemas = guias.map((g) => {
      if (g.problema || !g.numero) return g;
      if (enNuevo.has(g.numero)) {
        return { ...g, problema: `Ya se ingresó con anterioridad (${textoIngreso(enNuevo.get(g.numero))}).` };
      }
      if (enViejo.has(g.numero)) {
        return { ...g, problema: `Ya está ingresada en el sistema viejo con el documento ${textoIngreso(enViejo.get(g.numero))}.` };
      }
      return g;
    });
    return {
      aerolinea: { id: aerolinea.id, nombre: aerolinea.alias?.trim() || aerolinea.nombre, codigo: aerolinea.codigo, prefijo },
      guias: conProblemas,
      revisadoSistemaViejo,
      ok: conProblemas.every((g) => !g.problema),
    };
  }

  async crear(dto: GuardarIngresoDto, usuario?: string) {
    const p = await this.previsualizar(dto);
    this.exigirSinProblemas(p);
    const referencia = await this.referencia(dto);
    return this.db.$transaction(async (tx) => {
      const numero = await siguiente(tx, 'CGU', inicioIngreso());
      const doc = await tx.documentoBase.create({
        data: {
          numero,
          fecha: fechaDe(dto.fecha),
          idAerolinea: dto.idAerolinea,
          idAgenciaIata: dto.idAgenciaIata ?? null,
          tipoStock: dto.virtual ? 'VIRTUAL' : 'NORMAL',
          estado: 'INGRESADO',
          referencia,
          nota: dto.nota?.trim() || null,
          creadoPorLegacy: usuario ?? null,
        },
      });
      await this.agregarGuias(tx, doc.id, dto, p);
      return { id: doc.id, numero };
    });
  }

  /**
   * Modificar: cabecera y guías. Como el sistema viejo: una guía usada
   * (coordinada o prestada) no se quita; un ingreso cancelado (todas usadas)
   * no se modifica; la aerolínea no cambia si ya hay guías usadas.
   */
  async actualizar(id: number, dto: GuardarIngresoDto, usuario?: string) {
    const doc = await this.editable(id);
    if (doc.estado === 'CANCELADO') {
      throw new ConflictException(
        'El ingreso no puede modificarse: todas sus guías ya están coordinadas, o prestadas y devueltas.',
      );
    }
    const vigentes = doc.guiasMadre.filter((g) => g.estado !== 'ANULADA');
    const usadas = vigentes.filter((g) => g.estado === 'COORDINADA' || g.estado === 'PRESTADA');
    if (dto.idAerolinea !== doc.idAerolinea && usadas.length) {
      throw new ConflictException(
        `No se puede cambiar la aerolínea: el ingreso tiene ${usadas.length === 1 ? '1 guía usada' : `${usadas.length} guías usadas`}.`,
      );
    }
    const p = await this.previsualizar(dto, id);
    this.exigirSinProblemas(p);
    const nuevas = new Set(p.guias.map((g) => g.numero!));
    const quitar = vigentes.filter((g) => !nuevas.has(g.numero!));
    const quitarUsada = quitar.find((g) => g.estado !== 'INGRESADA');
    if (quitarUsada) {
      const coo = quitarUsada.documentoCoordinacion;
      throw new ConflictException(
        quitarUsada.estado === 'COORDINADA'
          ? `La guía ${quitarUsada.numero} no se puede quitar: ya la usa la coordinación N° ${coo?.codigoAccess ?? coo?.id ?? quitarUsada.coordinacionAccess ?? '?'}.`
          : `La guía ${quitarUsada.numero} no se puede quitar: está prestada.`,
      );
    }
    const referencia = await this.referencia(dto);
    const existentes = new Set(vigentes.map((g) => g.numero));
    return this.db.$transaction(async (tx) => {
      await tx.documentoBase.update({
        where: { id },
        data: {
          fecha: fechaDe(dto.fecha),
          idAerolinea: dto.idAerolinea,
          idAgenciaIata: dto.idAgenciaIata ?? null,
          tipoStock: dto.virtual ? 'VIRTUAL' : 'NORMAL',
          referencia,
          nota: dto.nota?.trim() || null,
          actualizadoPorLegacy: usuario ?? null,
        },
      });
      // Quitadas: no las usa nadie, se anulan (quedan en el historial del ingreso).
      if (quitar.length) {
        await tx.guiaMadre.updateMany({ where: { id: { in: quitar.map((g) => g.id) } }, data: { estado: 'ANULADA' } });
      }
      await tx.guiaMadre.updateMany({
        where: { idDocumentoBase: id, estado: { not: 'ANULADA' } },
        data: { virtual: dto.virtual, idAerolinea: dto.idAerolinea },
      });
      await this.agregarGuias(tx, id, dto, { ...p, guias: p.guias.filter((g) => !existentes.has(g.numero)) });
      await recalcularEstadoIngresos(tx, [id]);
      return { id, numero: doc.numero };
    });
  }

  /** Anular: solo si ninguna guía se usó. Sus guías quedan anuladas (el sistema viejo las borra). */
  async anular(id: number, usuario?: string) {
    const doc = await this.editable(id);
    const usadas = doc.guiasMadre.filter((g) => g.estado === 'COORDINADA' || g.estado === 'PRESTADA');
    if (usadas.length) {
      throw new ConflictException(
        `${textoIngreso(doc.numero)} no se puede anular: tiene ${usadas.length === 1 ? '1 guía usada' : `${usadas.length} guías usadas`} (coordinada o prestada).`,
      );
    }
    await this.db.$transaction([
      this.db.guiaMadre.updateMany({ where: { idDocumentoBase: id }, data: { estado: 'ANULADA' } }),
      this.db.documentoBase.update({ where: { id }, data: { estado: 'ANULADO', actualizadoPorLegacy: usuario ?? null } }),
    ]);
    return { id, anulado: true };
  }

  /** "Corrección de estado erróneo": pone el estado que corresponde a sus guías. */
  async corregirEstado(id: number) {
    await this.editable(id);
    await this.db.$transaction((tx) => recalcularEstadoIngresos(tx, [id]));
    return this.detalle(id);
  }

  // ---------------------------------------------------------------------------

  private async editable(id: number): Promise<DocConGuias> {
    const doc = await this.db.documentoBase.findUnique({ where: { id }, include: includeGuias });
    if (!doc) throw new NotFoundException('El ingreso de guías no existe.');
    asegurarEditable(doc, `El ingreso ${textoIngreso(doc.numero)}`);
    if (doc.estado === 'ANULADO') throw new ConflictException(`${textoIngreso(doc.numero)} está anulado.`);
    return doc;
  }

  private exigirSinProblemas(p: PrevisualizacionIngreso) {
    const malas = p.guias.filter((g) => g.problema);
    if (malas.length) {
      throw new BadRequestException(malas.map((g) => `${g.texto ?? g.entrada}: ${g.problema}`).join(' '));
    }
  }

  /** Referencia guardada: la escrita, o el código IATA de la agencia elegida. */
  private async referencia(dto: GuardarIngresoDto): Promise<string | null> {
    if (dto.referencia?.trim()) return dto.referencia.trim();
    if (!dto.idAgenciaIata) return null;
    const a = await this.maestros.agenciaIata.findUnique({ where: { id: dto.idAgenciaIata }, select: { iataCodeCarrier: true } });
    return a?.iataCodeCarrier?.trim() || null;
  }

  /** Crea las guías nuevas; una que existía anulada (ingreso anulado) se reutiliza: el número es único. */
  private async agregarGuias(tx: Prisma.TransactionClient, idDocumentoBase: number, dto: GuardarIngresoDto, p: PrevisualizacionIngreso) {
    for (const g of p.guias) {
      if (!g.numero) continue;
      const data = {
        prefijo: Number(p.aerolinea.prefijo),
        secuencial: Number(g.numero.slice(4)),
        idDocumentoBase,
        idAerolinea: dto.idAerolinea,
        estado: 'INGRESADA' as const,
        virtual: dto.virtual,
        prestada: false,
        devolucion: false,
        fechaPrestamo: null,
        fechaDevolucion: null,
        observaciones: null,
        coordinacionAccess: null,
      };
      await tx.guiaMadre.upsert({ where: { numero: g.numero }, create: { numero: g.numero, ...data }, update: data });
    }
  }

  private resumen(d: DocConGuias, refs: Awaited<ReturnType<NombresMaestrosService['resolver']>>): IngresoResumen {
    return {
      id: d.id,
      numero: d.numero ?? d.codigoAccess,
      origen: d.codigoAccess !== null ? 'ACCESS' : 'SISTEMA',
      fecha: dia(d.fecha),
      aerolinea: ref(refs.aerolineas, d.idAerolinea),
      agencia: ref(refs.agencias, d.idAgenciaIata),
      referencia: d.referencia,
      tipoStock: d.tipoStock,
      estado: d.estado,
      guias: d.guiasMadre.map((g) => ({
        id: g.id,
        numero: g.numero,
        estado: g.estado,
        virtual: !!g.virtual,
        prestada: !!g.prestada,
        devuelta: !!g.devolucion,
        fechaPrestamo: dia(g.fechaPrestamo),
        fechaDevolucion: dia(g.fechaDevolucion),
        observaciones: g.observaciones,
        coordinacion: g.documentoCoordinacion
          ? {
              id: g.documentoCoordinacion.id,
              numero: g.documentoCoordinacion.codigoAccess ?? g.documentoCoordinacion.id,
              fechaVuelo: dia(g.documentoCoordinacion.fechaVuelo),
            }
          : g.coordinacionAccess
            ? { id: null, numero: g.coordinacionAccess, fechaVuelo: null }
            : null,
      })),
    };
  }
}
