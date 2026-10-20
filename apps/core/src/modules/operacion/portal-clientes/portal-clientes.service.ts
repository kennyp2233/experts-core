import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PrismaClient as PrismaUsuarios } from '@internal/usuarios-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { NombresMaestrosService, ref, RefMaestro } from '../maestros/nombres-maestros.service';
import { CuentasService } from '../documentos/cuentas.service';
import { ImpresionService } from '../documentos/impresion.service';

/** Usuario del portal (lo que deja la estrategia JWT en `req.user`). */
export interface UsuarioCliente {
  userId: string;
  username: string;
}

const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const corto = (r: RefMaestro | null) => (r ? { id: r.id, codigo: r.codigo, nombre: r.alias || r.nombre } : null);
const DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Portal de clientes (rol CLIENTE): el cliente de la marca ve sus guías (las de
 * sus marcas, también las del sistema viejo, solo lectura), en qué vuelo van,
 * sus guías hijas por finca, la liquidación de cada guía cortada y su estado
 * de cuenta. Solo ve lo que se le cobra: nunca los valores de la aerolínea
 * (costos) ni guías de otros clientes.
 */
@Injectable()
export class PortalClientesService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly docs: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
    @Inject('PrismaClientUsuarios') private readonly usuarios: PrismaUsuarios,
    private readonly nombres: NombresMaestrosService,
    private readonly cuentas: CuentasService,
    private readonly impresion: ImpresionService,
  ) {}

  private async clientesDe(u: UsuarioCliente): Promise<number[]> {
    const r = await this.usuarios.usuarioCliente.findMany({ where: { userId: u.userId }, select: { idCliente: true } });
    if (r.length === 0) throw new ForbiddenException('Tu usuario no tiene clientes asignados: pídele a Experts que te los asigne.');
    return r.map((x) => x.idCliente);
  }

  private async marcasDe(u: UsuarioCliente): Promise<number[]> {
    const clientes = await this.clientesDe(u);
    return (await this.maestros.consignatario.findMany({ where: { idCliente: { in: clientes } }, select: { id: true } })).map((m) => m.id);
  }

  /** La coordinación, si es de una marca del usuario. */
  private async propia(u: UsuarioCliente, id: number) {
    const marcas = await this.marcasDe(u);
    const c = await this.docs.documentoCoordinacion.findFirst({
      where: { id, idConsignatario: { in: marcas }, estadoActual: { not: 'ANULADO' } },
    });
    if (!c) throw new NotFoundException('No encontramos esa guía entre las suyas.');
    return c;
  }

  async perfil(u: UsuarioCliente) {
    const [user, ids] = await Promise.all([
      this.usuarios.user.findUnique({ where: { id: u.userId }, select: { username: true, firstName: true, email: true } }),
      this.clientesDe(u),
    ]);
    const clientes = await this.maestros.cliente.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, alias: true } });
    return {
      usuario: user?.username ?? u.username,
      nombre: user?.firstName ?? '',
      email: user?.email?.endsWith('@clientes.local') ? null : (user?.email ?? null),
      clientes: clientes.map((c) => ({ id: c.id, nombre: c.alias?.trim() || c.nombre })),
    };
  }

  async guias(u: UsuarioCliente, f: { desde?: string; hasta?: string; q?: string; page?: number }) {
    const marcas = await this.marcasDe(u);
    const and: Prisma.DocumentoCoordinacionWhereInput[] = [{ idConsignatario: { in: marcas } }, { estadoActual: { not: 'ANULADO' } }];
    if (f.desde && DIA.test(f.desde)) and.push({ fechaVuelo: { gte: new Date(`${f.desde}T00:00:00Z`) } });
    if (f.hasta && DIA.test(f.hasta)) and.push({ fechaVuelo: { lte: new Date(`${f.hasta}T00:00:00Z`) } });
    const q = f.q?.trim();
    if (q) {
      const digitos = q.replace(/\D/g, '');
      and.push({
        OR: [
          { numeroGuia: { contains: q, mode: 'insensitive' } },
          ...(digitos.length >= 4 ? [{ guiaMadre: { numero: { contains: digitos.length === 11 ? `${digitos.slice(0, 3)}-${digitos.slice(3)}` : digitos } } }] : []),
          { guiaHijas: { some: { numeroGuiaHija: q.replace(/\s+/g, '') } } },
        ],
      });
    }
    const page = Math.max(1, f.page ?? 1);
    const pageSize = 30;
    const where = { AND: and };
    const [total, filas] = await Promise.all([
      this.docs.documentoCoordinacion.count({ where }),
      this.docs.documentoCoordinacion.findMany({
        where,
        orderBy: [{ fechaVuelo: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { guiaHijas: true } },
          rutas: { where: { vuelo: { not: null } }, select: { vuelo: true, codigo: true }, take: 1 },
        },
      }),
    ]);
    const refs = await this.nombres.resolver({
      aerolineas: filas.map((c) => c.idAerolinea),
      consignatarios: filas.map((c) => c.idConsignatario),
      destinos: filas.map((c) => c.idDestinoFinalDocs ?? c.idDestinoAwb),
    });
    return {
      total,
      page,
      pageSize,
      items: filas.map((c) => ({
        id: c.id,
        numeroGuia: c.numeroGuia,
        fechaVuelo: dia(c.fechaVuelo),
        estado: c.estadoActual === 'CORTADO' ? 'DESPACHADA' : 'EN_PREPARACION',
        aerolinea: corto(ref(refs.aerolineas, c.idAerolinea)),
        marca: corto(ref(refs.consignatarios, c.idConsignatario)),
        destino: corto(ref(refs.destinos, c.idDestinoFinalDocs ?? c.idDestinoAwb)),
        vuelo: c.rutas[0]?.vuelo ?? null,
        fulls: c.totalFulls,
        cajas: c.totalCajas,
        kgs: c.totalKgs,
        guiasHijas: c._count.guiaHijas,
      })),
    };
  }

  async guia(u: UsuarioCliente, id: number) {
    const c0 = await this.propia(u, id);
    const c = await this.docs.documentoCoordinacion.findUniqueOrThrow({
      where: { id: c0.id },
      include: {
        rutas: { orderBy: { orden: 'asc' } },
        manifiesto: true,
        guiaHijas: { orderBy: { secuencial: 'asc' }, include: { detalles: { orderBy: { numeroLinea: 'asc' } } } },
      },
    });
    const refs = await this.nombres.resolver({
      aerolineas: [c.idAerolinea],
      consignatarios: [c.idConsignatario],
      destinos: [c.idDestinoAwb, c.idDestinoFinalDocs],
      fincas: c.guiaHijas.map((g) => g.idFinca),
      productos: c.guiaHijas.flatMap((g) => g.detalles.map((d) => d.idProducto)),
    });
    const liquidacion =
      c.estadoActual === 'CORTADO' ? await this.cuentas.liquidacionGuia(c.id, await this.clientesDe(u)) : null;
    return {
      id: c.id,
      numeroGuia: c.numeroGuia,
      fechaVuelo: dia(c.fechaVuelo),
      estado: c.estadoActual === 'CORTADO' ? 'DESPACHADA' : 'EN_PREPARACION',
      aerolinea: corto(ref(refs.aerolineas, c.idAerolinea)),
      marca: corto(ref(refs.consignatarios, c.idConsignatario)),
      destino: corto(ref(refs.destinos, c.idDestinoAwb)),
      destinoFinal: corto(ref(refs.destinos, c.idDestinoFinalDocs)),
      pago: c.pago,
      totales: { fulls: c.totalFulls, cajas: c.totalCajas, kgs: c.totalKgs },
      ruta: c.rutas.map((r) => ({
        tipo: r.tipoRuta,
        codigo: r.codigo,
        vuelo: r.vuelo,
        salida: iso(r.fechaHoraSalida),
        llegada: iso(r.fechaHoraLlegada),
      })),
      manifiesto: c.manifiesto?.referencia ?? null,
      guiasHijas: c.guiaHijas.map((g) => {
        const finca = ref(refs.fincas, g.idFinca);
        return {
          id: g.id,
          numero: g.numeroGuiaHija,
          finca: finca ? finca.alias || finca.nombre : null,
          dae: g.dae,
          piezas: g.totalPiezas,
          fulls: g.totalFulls,
          kgs: g.pesoBruto,
          productos: [...new Set(g.detalles.map((d) => ref(refs.productos, d.idProducto)?.nombre ?? d.codigoProducto).filter(Boolean))],
          facturas: [...new Set(g.detalles.map((d) => d.factura).filter((x): x is string => !!x && x !== '0'))],
        };
      }),
      // Lo que se le cobra (solo cuando la guía ya se cortó: antes los valores pueden cambiar).
      liquidacion,
    };
  }

  /** Datos para imprimir sus guías hijas (House Air Waybill por finca). */
  async impresionGuiasHijas(u: UsuarioCliente, id: number) {
    await this.propia(u, id);
    return this.impresion.guiasHijas(id);
  }

  async estadoCuenta(u: UsuarioCliente, f: { desde?: string; hasta?: string; idCliente?: number }) {
    const ids = await this.clientesDe(u);
    const idCliente = f.idCliente ?? (ids.length === 1 ? ids[0] : undefined);
    if (!idCliente) throw new BadRequestException('Elija el cliente.');
    if (!ids.includes(idCliente)) throw new ForbiddenException('Ese cliente no está asignado a su usuario.');
    return this.cuentas.estadoCuenta({ desde: f.desde, hasta: f.hasta, idCliente, idsCliente: ids });
  }

  async estadoCuentaXlsx(u: UsuarioCliente, f: { desde?: string; hasta?: string; idCliente?: number }) {
    const ids = await this.clientesDe(u);
    const idCliente = f.idCliente ?? (ids.length === 1 ? ids[0] : undefined);
    if (!idCliente || !ids.includes(idCliente)) throw new ForbiddenException('Elija uno de sus clientes.');
    return this.cuentas.estadoCuentaXlsx({ desde: f.desde, hasta: f.hasta, idCliente, idsCliente: ids });
  }
}
