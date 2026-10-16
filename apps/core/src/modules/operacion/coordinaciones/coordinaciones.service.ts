import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { resumirLiquidacion } from '../calculos/liquidacion';
import { NombresMaestrosService, ref } from '../maestros/nombres-maestros.service';
import {
  CoordinacionDetalle,
  CoordinacionPagina,
  CoordinacionResumen,
} from './coordinaciones.types';
import { ListarCoordinacionesDto } from './dto/listar-coordinaciones.dto';

/** Fecha de solo día → "YYYY-MM-DD" (se guardan a las 00:00 UTC). */
const dia = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);
const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

const selectResumen = {
  id: true,
  codigoAccess: true,
  numeroGuia: true,
  estadoActual: true,
  fechaVuelo: true,
  fechaAsignacion: true,
  idAerolinea: true,
  idConsignatario: true,
  idDestinoAwb: true,
  idDestinoFinalDocs: true,
  totalFulls: true,
  totalCajas: true,
  totalKgs: true,
  liqTotal: true,
  liqPesoCobrable: true,
  corteExtra: true,
  nota: true,
  _count: { select: { guiaHijas: true } },
  manifiesto: { select: { referencia: true } },
  // El peso cobrable que da la aerolínea (la columna "VOL." de la lista vieja = extCWeight).
  liquidaciones: { where: { tipo: 'NORMAL' }, select: { pesoCobrable: true } },
} satisfies Prisma.DocumentoCoordinacionSelect;

type FilaResumen = Prisma.DocumentoCoordinacionGetPayload<{ select: typeof selectResumen }>;

/**
 * Consulta de coordinaciones (schema `documentos`): las sincronizadas desde
 * Access y, más adelante, las creadas en el sistema nuevo.
 */
@Injectable()
export class CoordinacionesService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    private readonly nombres: NombresMaestrosService,
  ) {}

  async listar(f: ListarCoordinacionesDto): Promise<CoordinacionPagina> {
    const page = f.page ?? 1;
    const pageSize = f.pageSize ?? 50;
    const where = await this.filtro(f);
    const [total, filas, suma, cobrable] = await Promise.all([
      this.db.documentoCoordinacion.count({ where }),
      this.db.documentoCoordinacion.findMany({
        where,
        select: selectResumen,
        orderBy: [{ fechaVuelo: 'desc' }, { codigoAccess: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.documentoCoordinacion.aggregate({
        where,
        _sum: { totalFulls: true, totalCajas: true, totalKgs: true },
      }),
      this.db.documentoLiquidacion.aggregate({
        where: { tipo: 'NORMAL', documentoCoordinacion: where },
        _sum: { pesoCobrable: true },
      }),
    ]);
    const refs = await this.nombres.resolver({
      aerolineas: filas.map((c) => c.idAerolinea),
      consignatarios: filas.map((c) => c.idConsignatario),
      destinos: filas.flatMap((c) => [c.idDestinoAwb, c.idDestinoFinalDocs]),
    });
    return {
      items: filas.map((c) => this.resumen(c, refs)),
      totales: {
        fulls: suma._sum.totalFulls ?? 0,
        cajas: suma._sum.totalCajas ?? 0,
        kgs: suma._sum.totalKgs ?? 0,
        pesoCobrable: cobrable._sum.pesoCobrable ?? 0,
      },
      total,
      page,
      pageSize,
    };
  }

  async detalle(id: number): Promise<CoordinacionDetalle> {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: {
        _count: { select: { guiaHijas: true } },
        guiaMadre: { include: { documentoBase: { select: { id: true, codigoAccess: true, fecha: true } } } },
        rutas: { orderBy: { orden: 'asc' } },
        liquidaciones: { orderBy: { tipo: 'asc' } },
        manifiesto: true,
        marcas: { orderBy: { orden: 'asc' } },
        medidas: { orderBy: { orden: 'asc' } },
        guiaHijas: {
          orderBy: { secuencial: 'asc' },
          include: { detalles: { orderBy: { numeroLinea: 'asc' }, include: { tipoCaja: true } } },
        },
      },
    });
    if (!c) throw new NotFoundException(`Coordinación ${id} no encontrada`);

    const refs = await this.nombres.resolver({
      aerolineas: [c.idAerolinea],
      consignatarios: [
        c.idConsignatario,
        ...c.marcas.map((m) => m.idConsignatario),
        ...c.guiaHijas.map((g) => g.idConsignatario),
      ],
      destinos: [c.idDestinoAwb, c.idDestinoFinalDocs],
      agencias: [c.idAgenciaIata],
      tiposEmbarque: [c.idTipoEmbarque],
      fincas: c.guiaHijas.map((g) => g.idFinca),
      productos: c.guiaHijas.flatMap((g) => g.detalles.map((d) => d.idProducto)),
    });

    return {
      ...this.resumen(c, refs),
      agencia: ref(refs.agencias, c.idAgenciaIata),
      tipoEmbarque: ref(refs.tiposEmbarque, c.idTipoEmbarque),
      pago: c.pago,
      referencia: c.referencia,
      nota: c.nota,
      totalVolumen: c.totalVolumen,
      cupoFulls: c.cupoFulls,
      guiaMadre: {
        id: c.guiaMadre.id,
        numero: c.guiaMadre.numero,
        estado: c.guiaMadre.estado,
        virtual: c.guiaMadre.virtual,
        lote: c.guiaMadre.documentoBase
          ? {
              id: c.guiaMadre.documentoBase.id,
              codigoAccess: c.guiaMadre.documentoBase.codigoAccess,
              fecha: dia(c.guiaMadre.documentoBase.fecha),
            }
          : null,
      },
      liquidacion: {
        fulls: c.liqFulls,
        piezas: c.liqPiezas,
        pesoBruto: c.liqPesoBruto,
        pesoCobrable: c.liqPesoCobrable,
        tarifa: c.liqTarifa,
        flete: c.liqFlete,
        dueAgent: c.liqDueAgent,
        dueCarrier: c.liqDueCarrier,
        total: c.liqTotal,
        comision: c.comision,
        incentivo: c.incentivo,
      },
      certificadoOrigen: c.certificadoOrigen,
      liquidaciones: c.liquidaciones.map(({ id: _id, idDocumentoCoordinacion: _c, ...l }) => ({
        ...l,
        resumen: resumirLiquidacion(l),
      })),
      rutas: c.rutas.map((r) => ({
        orden: r.orden,
        tipoRuta: r.tipoRuta,
        codigo: r.codigo,
        vuelo: r.vuelo,
        fechaHoraSalida: iso(r.fechaHoraSalida),
        fechaHoraLlegada: iso(r.fechaHoraLlegada),
        salidaTipo: r.salidaTipo,
        llegadaTipo: r.llegadaTipo,
      })),
      manifiesto: c.manifiesto
        ? {
            origen: c.manifiesto.origen,
            aduana: c.manifiesto.aduana,
            anio: c.manifiesto.anio,
            tipo: c.manifiesto.tipo,
            numero: c.manifiesto.numero,
            vuelo: c.manifiesto.vuelo,
            fechaArribo: c.manifiesto.fechaArribo,
            horaArribo: c.manifiesto.horaArribo,
            secuencial: c.manifiesto.secuencial,
            referencia: c.manifiesto.referencia,
          }
        : null,
      marcas: c.marcas.map((m) => ({ orden: m.orden, consignatario: ref(refs.consignatarios, m.idConsignatario) })),
      medidas: c.medidas.map(({ id: _id, idDocumentoCoordinacion: _c, ...m }) => m),
      guias: c.guiaHijas.map((g) => ({
        id: g.id,
        numeroGuiaHija: g.numeroGuiaHija,
        dae: g.dae,
        finca: ref(refs.fincas, g.idFinca),
        consignatario: ref(refs.consignatarios, g.idConsignatario),
        pesoBruto: g.pesoBruto,
        totalPiezas: g.totalPiezas,
        totalFulls: g.totalFulls,
        lineas: g.detalles.map((d) => ({
          id: d.id,
          numeroLinea: d.numeroLinea,
          producto: ref(refs.productos, d.idProducto),
          codigoProducto: d.codigoProducto,
          tipoCaja: d.tipoCaja ? { id: d.tipoCaja.id, codigo: d.tipoCaja.codigo, nombre: d.tipoCaja.nombre } : null,
          cantidadCajas: d.cantidadCajas,
          fulls: d.fulls,
          pesoKg: d.pesoKg,
          tallos: d.tallos,
          valor: d.valor,
          dae: d.dae,
          largo: d.largo,
          ancho: d.ancho,
          alto: d.alto,
          nota: d.nota,
          factura: d.factura,
          origen: d.origen,
          usuario: d.usuario,
          fechaRegistro: iso(d.fechaRegistro),
        })),
      })),
      datosLegacy: (c.datosLegacy as Record<string, unknown> | null) ?? null,
      auditoria: {
        creadoPor: c.creadoPorLegacy,
        creadoEn: iso(c.creadoEnLegacy),
        actualizadoPor: c.actualizadoPorLegacy,
        actualizadoEn: iso(c.actualizadoEnLegacy),
      },
    };
  }

  private async filtro(f: ListarCoordinacionesDto): Promise<Prisma.DocumentoCoordinacionWhereInput> {
    const and: Prisma.DocumentoCoordinacionWhereInput[] = [];
    if (f.estado) and.push({ estadoActual: f.estado });
    if (f.desde) and.push({ fechaVuelo: { gte: new Date(`${f.desde.slice(0, 10)}T00:00:00Z`) } });
    if (f.hasta) and.push({ fechaVuelo: { lte: new Date(`${f.hasta.slice(0, 10)}T00:00:00Z`) } });
    if (f.idAerolinea) and.push({ idAerolinea: f.idAerolinea });
    if (f.idConsignatario) and.push({ idConsignatario: f.idConsignatario });
    if (f.idDestino) and.push({ OR: [{ idDestinoAwb: f.idDestino }, { idDestinoFinalDocs: f.idDestino }] });
    const q = f.q?.trim();
    if (q) {
      const sinEspacios = q.replace(/\s+/g, '');
      const digitos = q.replace(/\D/g, '');
      const or: Prisma.DocumentoCoordinacionWhereInput[] = [
        { numeroGuia: { contains: q, mode: 'insensitive' } },
        { guiaMadre: { numero: { contains: sinEspacios, mode: 'insensitive' } } },
        { guiaHijas: { some: { numeroGuiaHija: sinEspacios } } },
        { guiaHijas: { some: { dae: { contains: q } } } },
      ];
      // La guía se escribe de muchas formas (369-8469 5461, 8469-5461, 36984695461): se compara por dígitos.
      if (digitos.length >= 4 && digitos !== sinEspacios) {
        const numero = digitos.length === 11 ? `${digitos.slice(0, 3)}-${digitos.slice(3)}` : digitos;
        or.push({ guiaMadre: { numero: { contains: numero } } });
      }
      // N° de coordinación: el del sistema viejo, o el id en las creadas en el sistema nuevo.
      if (/^\d{1,7}$/.test(q)) or.push({ codigoAccess: Number(q) }, { codigoAccess: null, id: Number(q) });
      // Marca, cliente o finca por nombre.
      if (/[a-zñ]/i.test(q) && q.length >= 3) {
        const ids = await this.nombres.buscarPorNombre(q);
        if (ids.consignatarios.length) or.push({ idConsignatario: { in: ids.consignatarios } });
        if (ids.fincas.length) or.push({ guiaHijas: { some: { idFinca: { in: ids.fincas } } } });
      }
      and.push({ OR: or });
    }
    return and.length ? { AND: and } : {};
  }

  private resumen(
    c: Omit<FilaResumen, 'manifiesto' | 'liquidaciones'> & {
      manifiesto: { referencia: string | null } | null;
      liquidaciones: Array<{ pesoCobrable: number | null; tipo?: string }>;
    },
    refs: Awaited<ReturnType<NombresMaestrosService['resolver']>>,
  ): CoordinacionResumen {
    return {
      id: c.id,
      codigoAccess: c.codigoAccess,
      origen: c.codigoAccess !== null ? 'ACCESS' : 'SISTEMA',
      numeroGuia: c.numeroGuia,
      estado: c.estadoActual,
      fechaVuelo: dia(c.fechaVuelo)!,
      fechaAsignacion: dia(c.fechaAsignacion)!,
      aerolinea: ref(refs.aerolineas, c.idAerolinea),
      consignatario: ref(refs.consignatarios, c.idConsignatario),
      cliente: ref(refs.clientesPorConsignatario, c.idConsignatario),
      destino: ref(refs.destinos, c.idDestinoAwb),
      destinoFinal: ref(refs.destinos, c.idDestinoFinalDocs),
      totalFulls: c.totalFulls,
      totalCajas: c.totalCajas,
      totalKgs: c.totalKgs,
      guiasHijas: c._count.guiaHijas,
      liqTotal: c.liqTotal,
      pesoCobrable: c.liquidaciones.find((l) => !l.tipo || l.tipo === 'NORMAL')?.pesoCobrable ?? c.liqPesoCobrable,
      codigoManifiesto: c.manifiesto?.referencia ?? null,
      corteExtra: c.corteExtra,
      nota: c.nota,
    };
  }
}
