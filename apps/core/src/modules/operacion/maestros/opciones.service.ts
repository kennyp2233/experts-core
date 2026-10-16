import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { modoOperacion } from '../comun/modo-operacion';

/** Opción para los buscadores de la pantalla de coordinar. */
export interface Opcion {
  id: number;
  codigo: string | null;
  nombre: string;
  detalle: string | null;
  extra?: Record<string, unknown>;
}

const ins = (q: string) => ({ contains: q, mode: 'insensitive' as const });
/** "369-84695461" → "369-8469 5461". */
const awb = (n: string) => (n.length === 12 ? `${n.slice(0, 8)} ${n.slice(8)}` : n);
const s = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v));

/**
 * Opciones (solo registros activos) para los selectores de coordinar, con los
 * datos que la pantalla usa como default (medidas de caja de la finca, destino
 * de la marca, aerolínea de la guía).
 */
@Injectable()
export class OpcionesService {
  constructor(
    @Inject('PrismaClientDatosMaestros') private readonly db: PrismaMaestros,
    @Inject(PRISMA_DOCUMENTOS) private readonly docs: PrismaDocumentos,
  ) {}

  /** `idAerolinea` (solo guías): las de esa aerolínea, como el combo del sistema viejo. */
  async buscar(tipo: string, q = '', limite = 20, ids?: number[], idAerolinea?: number): Promise<Opcion[]> {
    const t = q.trim();
    const take = Math.min(Math.max(limite, 1), 100);
    // `ids` trae opciones puntuales (para mostrar lo ya elegido al editar).
    const porIds = ids?.length ? { id: { in: ids } } : null;
    switch (tipo) {
      case 'guias': {
        // Se busca por número y/o aerolínea: "8469", "KL", "klm 8469".
        const digitos = t.replace(/\D/g, '');
        const letras = t.replace(/[\d\s-]/g, '');
        const aerolineas = letras
          ? await this.db.aerolinea.findMany({
              where: { OR: [{ codigo: ins(letras) }, { nombre: ins(letras) }, { alias: ins(letras) }] },
              select: { id: true },
            })
          : null;
        // Libres y de un ingreso vigente. En modo sombra, solo de ingresos del sistema nuevo:
        // las del viejo se coordinan allá.
        const where = porIds ?? {
          estado: 'INGRESADA' as const,
          documentoBase: {
            OR: [{ estado: null }, { estado: { not: 'ANULADO' as const } }],
            ...(modoOperacion() === 'sombra' ? { codigoAccess: null } : {}),
          },
          ...(digitos ? { numero: { contains: digitos.length === 11 ? `${digitos.slice(0, 3)}-${digitos.slice(3)}` : digitos } } : {}),
          ...(aerolineas ? { idAerolinea: { in: aerolineas.map((x) => x.id) } } : {}),
          ...(idAerolinea ? { AND: [{ idAerolinea }] } : {}),
        };
        // Como el sistema viejo: virtuales por número; normales por fecha de ingreso y número.
        const guias = await this.docs.guiaMadre.findMany({
          where,
          orderBy: [{ virtual: 'desc' }, { documentoBase: { fecha: 'asc' } }, { numero: 'asc' }],
          include: { documentoBase: { select: { numero: true, codigoAccess: true } } },
          take,
        });
        const aer = await this.db.aerolinea.findMany({
          where: { id: { in: [...new Set(guias.map((g) => g.idAerolinea).filter((x): x is number => x !== null))] } },
          select: { id: true, nombre: true, codigo: true, alias: true },
        });
        const a = new Map(aer.map((x) => [x.id, x]));
        return guias.map((g) => {
          const al = g.idAerolinea ? a.get(g.idAerolinea) : undefined;
          return {
            id: g.id,
            codigo: g.numero,
            nombre: g.numero ? awb(g.numero) : `Guía ${g.id}`,
            detalle: [
              al ? `${al.codigo ?? ''} ${al.alias?.trim() || al.nombre}`.trim() : null,
              g.virtual ? 'virtual' : 'normal',
              g.documentoBase.numero ? `ingreso CGU-${String(g.documentoBase.numero).padStart(7, '0')}` : null,
            ]
              .filter(Boolean)
              .join(' · '),
            extra: { idAerolinea: g.idAerolinea, virtual: g.virtual },
          };
        });
      }
      case 'consignatarios': {
        const where = porIds ?? {
          estado: true,
          ...(t ? { OR: [{ nombre: ins(t) }, { alias: ins(t) }, { ruc: ins(t) }] } : {}),
        };
        const rs = await this.db.consignatario.findMany({
          where,
          orderBy: { nombre: 'asc' },
          take,
          include: {
            guiaM: { include: { destino: { select: { id: true, codigo: true } } } },
            cliente: { select: { nombre: true, alias: true } },
          },
        });
        return rs.map((r) => ({
          id: r.id,
          codigo: s(r.codigoAccess),
          nombre: r.nombre,
          // El cliente de la marca (el "Embarcador" del sistema viejo) y la ciudad.
          detalle:
            [
              r.cliente ? `Cliente: ${r.cliente.alias?.trim() || r.cliente.nombre}` : null,
              [r.ciudad, r.pais].filter(Boolean).join(', ') || null,
            ]
              .filter(Boolean)
              .join(' · ') || null,
          extra: { idDestino: r.guiaM?.idDestino ?? null, destino: r.guiaM?.destino?.codigo ?? null },
        }));
      }
      case 'fincas': {
        const where = porIds ?? {
          estado: true,
          ...(t ? { OR: [{ nombreFinca: ins(t) }, { tag: ins(t) }, { rucFinca: ins(t) }] } : {}),
        };
        const rs = await this.db.finca.findMany({ where, orderBy: [{ tag: 'asc' }, { nombreFinca: 'asc' }], take });
        // Como en el sistema viejo, la finca se muestra por su alias (plaAlias); la razón social va debajo.
        return rs.map((r) => {
          const alias = r.tag?.trim() || r.nombreFinca;
          return {
            id: r.id,
            codigo: r.rucFinca,
            nombre: alias,
            detalle: alias.toUpperCase() !== r.nombreFinca.toUpperCase() ? r.nombreFinca : null,
            extra: { largo: r.cajaLargo, ancho: r.cajaAncho, alto: r.cajaAlto },
          };
        });
      }
      case 'productos': {
        const where = porIds ?? {
          estado: true,
          ...(t ? { OR: [{ nombre: ins(t) }, { codigo: ins(t) }, { nombreBotanico: ins(t) }] } : {}),
        };
        const rs = await this.db.producto.findMany({ where, orderBy: { nombre: 'asc' }, take });
        return rs.map((r) => ({ id: r.id, codigo: r.codigo, nombre: r.nombre, detalle: r.nombreBotanico }));
      }
      case 'agencias': {
        const where = porIds ?? {
          estado: true,
          ...(t ? { OR: [{ nombreShipper: ins(t) }, { alias: ins(t) }, { iataCodeCarrier: ins(t) }] } : {}),
        };
        const rs = await this.db.agenciaIata.findMany({ where, orderBy: { nombreShipper: 'asc' }, take });
        // Como el combo "Agencia - IATA" del viejo: el nombre de la agencia; abajo, su código IATA.
        return rs.map((r) => ({
          id: r.id,
          codigo: null,
          nombre: r.nombreShipper || r.alias || '',
          detalle: r.iataCodeCarrier ? `IATA ${r.iataCodeCarrier}` : null,
        }));
      }
      case 'aerolineas': {
        const where = porIds ?? {
          estado: true,
          ...(t ? { OR: [{ codigo: ins(t) }, { nombre: ins(t) }, { alias: ins(t) }] } : {}),
        };
        const rs = await this.db.aerolinea.findMany({ where, orderBy: { nombre: 'asc' }, take });
        return rs.map((r) => ({
          id: r.id,
          codigo: r.codigo,
          nombre: r.alias?.trim() || r.nombre,
          detalle: r.alias?.trim() && r.alias.trim() !== r.nombre ? r.nombre : null,
          // Prefijo de sus guías y tipo de stock por defecto (aerVirtual), para el ingreso de guías.
          extra: { prefijoAwb: r.prefijoAwb, guiasVirtuales: r.guiasVirtuales !== false },
        }));
      }
      case 'destinos': {
        const where = porIds ?? {
          estado: true,
          ...(t ? { OR: [{ codigo: ins(t) }, { nombre: ins(t) }, { aeropuerto: ins(t) }] } : {}),
        };
        const rs = await this.db.destino.findMany({ where, orderBy: { codigo: 'asc' }, take });
        return rs.map((r) => ({ id: r.id, codigo: r.codigo, nombre: r.nombre ?? r.codigo ?? '', detalle: r.aeropuerto }));
      }
      case 'tipos-embarque': {
        const where = porIds ?? (t ? { OR: [{ nombre: ins(t) }, { codigo: ins(t) }] } : {});
        const rs = await this.db.tipoEmbarque.findMany({ where, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }], take });
        return rs.map((r) => ({ id: r.id, codigo: r.codigo, nombre: r.nombre, detalle: r.mercancia }));
      }
      default:
        throw new BadRequestException(
          `Tipo desconocido: ${tipo}. Opciones: guias, consignatarios, fincas, productos, agencias, aerolineas, destinos, tipos-embarque`,
        );
    }
  }

  /**
   * Defaults al elegir la marca: destino de sus documentos (coincide con el
   * destino final en el 96 % de las coordinaciones desde 2022) y lo que se usó
   * en su última coordinación (agencia, aeropuerto de la guía, embarque, pago).
   */
  async sugerenciaConsignatario(idConsignatario: number) {
    const [guiaM, ultima] = await Promise.all([
      this.db.consignatarioGuiaM.findUnique({ where: { idConsignatario } }),
      this.docs.documentoCoordinacion.findFirst({
        where: { idConsignatario, estadoActual: { not: 'ANULADO' } },
        orderBy: { fechaVuelo: 'desc' },
        select: {
          idAgenciaIata: true,
          idDestinoAwb: true,
          idDestinoFinalDocs: true,
          idTipoEmbarque: true,
          pago: true,
          idAerolinea: true,
          fechaVuelo: true,
        },
      }),
    ]);
    return {
      idDestinoFinalDocs: guiaM?.idDestino ?? ultima?.idDestinoFinalDocs ?? null,
      ultima: ultima ? { ...ultima, fechaVuelo: ultima.fechaVuelo.toISOString().slice(0, 10) } : null,
    };
  }
}
