import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PrismaClient as PrismaUsuarios } from '@internal/usuarios-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { modoOperacion } from '../comun/modo-operacion';
import { CoordinacionCambiadaException, CoordinarService } from '../coordinaciones/coordinar.service';
import { GuardarCoordinacionDto, LineaCoordinacionDto } from '../coordinaciones/dto/guardar-coordinacion.dto';
import { NombresMaestrosService, ref } from '../maestros/nombres-maestros.service';
import { OpcionesService } from '../maestros/opciones.service';
import { DaeFincaDto, LineaFincaDto } from './portal-fincas.dto';

/** Usuario del portal (lo que deja la estrategia JWT en `req.user`). */
export interface UsuarioPortal {
  userId: string;
  username: string;
}

/** Hoy en Ecuador, a las 00:00 UTC (como se guardan las fechas de vuelo). */
const hoy = () => {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
};
const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Portal de las fincas: lo que hacía la web vieja (sistema.expertshcargo.com,
 * analizada el 16/10/2026). La finca ve las guías abiertas (sin cortar, con
 * vuelo de hoy en adelante) y carga en ellas lo de sus fincas: producto, fulls,
 * cajas, kg (cajas × `kgPorCaja` si no los pone; la web vieja usaba 22), DAE, factura, valor y tallos. Sus
 * líneas quedan con origen 'E' y su usuario, como `detOrigen`/`detUser` del
 * viejo, y la oficina las ve en el detalle de la coordinación. Puede corregir o
 * borrar lo suyo mientras la guía no esté cortada. También registra sus DAE.
 * En modo sombra solo ve las coordinaciones creadas en el sistema nuevo.
 */
@Injectable()
export class PortalFincasService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly docs: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
    @Inject('PrismaClientUsuarios') private readonly usuarios: PrismaUsuarios,
    private readonly coordinar: CoordinarService,
    private readonly opciones: OpcionesService,
    private readonly nombres: NombresMaestrosService,
  ) {}

  private async fincasDe(u: UsuarioPortal): Promise<number[]> {
    const r = await this.usuarios.usuarioFinca.findMany({ where: { userId: u.userId }, select: { idFinca: true } });
    if (r.length === 0) throw new ForbiddenException('Tu usuario no tiene fincas asignadas: pídele a la oficina que te las asigne.');
    return r.map((x) => x.idFinca);
  }

  /** Guías donde una finca puede cargar: abiertas y con vuelo de hoy en adelante. */
  private abiertas(): Prisma.DocumentoCoordinacionWhereInput {
    return {
      estadoActual: 'BORRADOR',
      fechaVuelo: { gte: hoy() },
      ...(modoOperacion() === 'sombra' ? { codigoAccess: null } : {}),
    };
  }

  private async abierta(id: number) {
    const c = await this.docs.documentoCoordinacion.findFirst({ where: { id, ...this.abiertas() } });
    if (!c) throw new NotFoundException('Esa guía ya no está abierta para cargar (se cortó o ya pasó el vuelo).');
    return c;
  }

  private async kgPorCaja(): Promise<number> {
    return (await this.coordinar.parametros()).lineas.kgPorCaja;
  }

  async perfil(u: UsuarioPortal) {
    const ids = await this.fincasDe(u);
    const fincas = await this.maestros.finca.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombreFinca: true, tag: true, rucFinca: true },
      orderBy: { nombreFinca: 'asc' },
    });
    return {
      usuario: u.username,
      fincas: fincas.map((f) => ({ id: f.id, nombre: f.tag?.trim() || f.nombreFinca, razonSocial: f.nombreFinca, ruc: f.rucFinca })),
      kgPorCaja: await this.kgPorCaja(),
    };
  }

  /** Las guías abiertas, una por coordinación, con lo que ya cargaron sus fincas. */
  async guias(u: UsuarioPortal) {
    const ids = await this.fincasDe(u);
    const cs = await this.docs.documentoCoordinacion.findMany({
      where: this.abiertas(),
      orderBy: [{ fechaVuelo: 'asc' }, { id: 'asc' }],
      include: { guiaHijas: { where: { idFinca: { in: ids } }, include: { detalles: true } } },
    });
    const refs = await this.nombres.resolver({
      aerolineas: cs.map((c) => c.idAerolinea),
      consignatarios: cs.map((c) => c.idConsignatario),
      destinos: cs.flatMap((c) => [c.idDestinoAwb, c.idDestinoFinalDocs]),
    });
    return cs.map((c) => {
      const mias = c.guiaHijas.flatMap((g) => g.detalles);
      const destino = ref(refs.destinos, c.idDestinoAwb);
      const final = ref(refs.destinos, c.idDestinoFinalDocs);
      const aerolinea = ref(refs.aerolineas, c.idAerolinea);
      return {
        id: c.id,
        guia: c.numeroGuia,
        fechaVuelo: dia(c.fechaVuelo),
        marca: ref(refs.consignatarios, c.idConsignatario)?.nombre ?? null,
        aerolinea: aerolinea ? aerolinea.alias || aerolinea.nombre : null,
        destino: destino?.codigo ?? null,
        destinoFinal: final && final.id !== destino?.id ? { codigo: final.codigo, nombre: final.nombre } : null,
        misLineas: mias.length,
        misFulls: mias.reduce((s, d) => s + (d.fulls ?? 0), 0),
        misCajas: mias.reduce((s, d) => s + d.cantidadCajas, 0),
      };
    });
  }

  /** Una guía: los datos para cargar y las líneas de sus fincas (las propias se pueden corregir o borrar). */
  async guia(u: UsuarioPortal, id: number) {
    const ids = await this.fincasDe(u);
    const c = await this.abierta(id);
    const lineas = await this.docs.guiaHijaDetalle.findMany({
      where: { guiaHija: { idDocumentoCoordinacion: id, idFinca: { in: ids } } },
      include: { guiaHija: { select: { idFinca: true, numeroGuiaHija: true } } },
      orderBy: [{ fechaRegistro: 'asc' }, { id: 'asc' }],
    });
    const [refs, productos, fincas, daes] = await Promise.all([
      this.nombres.resolver({
        aerolineas: [c.idAerolinea],
        consignatarios: [c.idConsignatario],
        destinos: [c.idDestinoAwb, c.idDestinoFinalDocs],
        fincas: ids,
        productos: lineas.map((l) => l.idProducto),
      }),
      this.maestros.fincaProducto.findMany({
        where: { idFinca: { in: ids } },
        include: { producto: { select: { id: true, codigo: true, nombre: true } } },
      }),
      this.maestros.finca.findMany({ where: { id: { in: ids } }, select: { id: true, nombreFinca: true, tag: true } }),
      c.idDestinoFinalDocs ?? c.idDestinoAwb
        ? this.opciones.daesVigentes(ids, (c.idDestinoFinalDocs ?? c.idDestinoAwb)!, dia(c.fechaVuelo))
        : Promise.resolve({} as Record<number, null>),
    ]);
    const aerolinea = ref(refs.aerolineas, c.idAerolinea);
    const destino = ref(refs.destinos, c.idDestinoAwb);
    const final = ref(refs.destinos, c.idDestinoFinalDocs);
    return {
      id: c.id,
      guia: c.numeroGuia,
      fechaVuelo: dia(c.fechaVuelo),
      marca: ref(refs.consignatarios, c.idConsignatario)?.nombre ?? null,
      aerolinea: aerolinea ? aerolinea.alias || aerolinea.nombre : null,
      destino: destino ? { codigo: destino.codigo, nombre: destino.nombre } : null,
      destinoFinal: final && final.id !== destino?.id ? { codigo: final.codigo, nombre: final.nombre } : null,
      kgPorCaja: await this.kgPorCaja(),
      fincas: fincas
        .map((f) => ({
          id: f.id,
          nombre: f.tag?.trim() || f.nombreFinca,
          productos: productos
            .filter((p) => p.idFinca === f.id)
            .map((p) => ({ id: p.producto.id, nombre: p.producto.codigo ?? p.nombre ?? p.producto.nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
          dae: daes[f.id] ?? null,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      lineas: lineas.map((l) => ({
        id: l.id,
        idFinca: l.guiaHija.idFinca,
        finca: (() => {
          const f = ref(refs.fincas, l.guiaHija.idFinca);
          return f ? f.alias || f.nombre : null;
        })(),
        idProducto: l.idProducto,
        producto: l.codigoProducto ?? ref(refs.productos, l.idProducto)?.nombre ?? null,
        fulls: l.fulls,
        cantidadCajas: l.cantidadCajas,
        pesoKg: l.pesoKg,
        dae: l.dae,
        factura: l.factura,
        valor: l.valor,
        tallos: l.tallos,
        nota: l.nota,
        guiaHija: l.guiaHija.numeroGuiaHija,
        registro: l.fechaRegistro?.toISOString() ?? null,
        // Lo que cargó la finca (por el portal) se corrige o borra; lo de la oficina, no.
        editable: l.origen === 'E',
      })),
    };
  }

  private async validarLinea(ids: number[], dto: LineaFincaDto) {
    if (!ids.includes(dto.idFinca)) throw new ForbiddenException('Esa finca no está asignada a tu usuario.');
    const productos = await this.maestros.fincaProducto.findMany({ where: { idFinca: dto.idFinca }, select: { idProducto: true } });
    // Como la web vieja: solo los productos de la finca (si la finca tiene su lista).
    if (productos.length && !productos.some((p) => p.idProducto === dto.idProducto)) {
      throw new BadRequestException('Ese producto no está en la lista de la finca.');
    }
    if (dto.cantidadCajas === 0 && dto.fulls > 0) throw new BadRequestException('Con fulls hay que poner las cajas.');
  }

  private async aLinea(dto: LineaFincaDto, idConsignatario: number, idLinea?: number): Promise<LineaCoordinacionDto> {
    const finca = await this.maestros.finca.findUnique({
      where: { id: dto.idFinca },
      select: { cajaLargo: true, cajaAncho: true, cajaAlto: true },
    });
    return {
      idLinea,
      idFinca: dto.idFinca,
      idProducto: dto.idProducto,
      idConsignatario,
      cantidadCajas: dto.cantidadCajas,
      fulls: dto.fulls,
      pesoKg: dto.pesoKg ?? Math.round(dto.cantidadCajas * (await this.kgPorCaja()) * 100) / 100,
      dae: dto.dae,
      factura: dto.factura?.trim() || undefined,
      valor: dto.valor,
      tallos: dto.tallos,
      // Como la web vieja: las medidas de caja de la ficha de la finca.
      largo: finca?.cajaLargo ?? undefined,
      ancho: finca?.cajaAncho ?? undefined,
      alto: finca?.cajaAlto ?? undefined,
    };
  }

  /** Una línea propia (cargada por la finca en el portal) de esa guía. */
  private async lineaPropia(id: number, idLinea: number, ids: number[]) {
    const l = await this.docs.guiaHijaDetalle.findUnique({ where: { id: idLinea }, include: { guiaHija: true } });
    if (!l || l.guiaHija.idDocumentoCoordinacion !== id || !ids.includes(l.guiaHija.idFinca)) {
      throw new NotFoundException('No encontramos esa línea en tus fincas.');
    }
    if (l.origen !== 'E') throw new ForbiddenException('Esa línea la cargó la oficina: solo la oficina la cambia.');
    return l;
  }

  /** Cargas en curso por guía: las de las fincas van de a una (en este proceso). */
  private readonly colas = new Map<number, Promise<unknown>>();

  /**
   * Graba un cambio sobre lo último que hay. Las fincas de una misma guía van en
   * fila; si la oficina grabó entre la lectura y la grabación, se relee y se
   * reintenta (hasta 3 veces).
   */
  private grabar(u: UsuarioPortal, id: number, cambiar: (base: GuardarCoordinacionDto) => void): Promise<void> {
    const previa = this.colas.get(id) ?? Promise.resolve();
    const esta = previa.then(async () => {
      for (let intento = 1; ; intento++) {
        const { dto: base } = await this.coordinar.dtoDe(id);
        cambiar(base);
        try {
          await this.coordinar.actualizar(id, base, u.username, 'E');
          return;
        } catch (e) {
          if (!(e instanceof CoordinacionCambiadaException) || intento === 3) throw e;
        }
      }
    });
    const fin = esta.catch(() => undefined);
    this.colas.set(id, fin);
    void fin.then(() => {
      if (this.colas.get(id) === fin) this.colas.delete(id);
    });
    return esta;
  }

  async agregarLinea(u: UsuarioPortal, id: number, dto: LineaFincaDto) {
    const ids = await this.fincasDe(u);
    const c = await this.abierta(id);
    await this.validarLinea(ids, dto);
    const linea = await this.aLinea(dto, c.idConsignatario!);
    await this.grabar(u, id, (base) => {
      base.lineas.push(linea);
    });
    return this.guia(u, id);
  }

  async cambiarLinea(u: UsuarioPortal, id: number, idLinea: number, dto: LineaFincaDto) {
    const ids = await this.fincasDe(u);
    const c = await this.abierta(id);
    await this.lineaPropia(id, idLinea, ids);
    await this.validarLinea(ids, dto);
    const linea = await this.aLinea(dto, c.idConsignatario!, idLinea);
    await this.grabar(u, id, (base) => {
      const i = base.lineas.findIndex((l) => l.idLinea === idLinea);
      if (i < 0) throw new NotFoundException('No encontramos esa línea en tus fincas.');
      base.lineas[i] = { ...linea, nota: base.lineas[i].nota };
    });
    return this.guia(u, id);
  }

  async quitarLinea(u: UsuarioPortal, id: number, idLinea: number) {
    const ids = await this.fincasDe(u);
    await this.abierta(id);
    await this.lineaPropia(id, idLinea, ids);
    await this.grabar(u, id, (base) => {
      base.lineas = base.lineas.filter((l) => l.idLinea !== idLinea);
    });
    return this.guia(u, id);
  }

  // --- DAE (como el módulo de DAEs de la web vieja: awbm_auxdaes) -----------------

  async daes(u: UsuarioPortal) {
    const ids = await this.fincasDe(u);
    const desde = new Date(hoy().getTime() - 62 * 86_400_000);
    const [rs, refs] = await Promise.all([
      this.maestros.daeFinca.findMany({
        where: { idFinca: { in: ids }, activa: true, fechaFin: { gte: desde } },
        orderBy: [{ fechaInicio: 'desc' }, { id: 'desc' }],
      }),
      this.nombres.resolver({ fincas: ids }),
    ]);
    const paises = new Map(
      (await this.maestros.pais.findMany({ where: { siglasPais: { in: [...new Set(rs.map((r) => r.pais))] } } })).map((p) => [
        p.siglasPais,
        p.nombre,
      ]),
    );
    return rs.map((r) => ({
      id: r.id,
      idFinca: r.idFinca,
      finca: (() => {
        const f = ref(refs.fincas, r.idFinca);
        return f ? f.alias || f.nombre : null;
      })(),
      pais: r.pais,
      nombrePais: paises.get(r.pais) ?? r.pais,
      desde: dia(r.fechaInicio),
      hasta: dia(r.fechaFin),
      dae: r.dae,
      vigente: r.fechaInicio <= hoy() && r.fechaFin >= hoy(),
      // Las del sistema viejo se cambian allá; las del portal, aquí.
      editable: r.codigoAccess === null,
    }));
  }

  /** Países a los que van las guías (los del registro de DAEs del último año), para elegir el de la DAE. */
  async paises() {
    const desde = new Date(hoy().getTime() - 365 * 86_400_000);
    const usados = await this.maestros.daeFinca.groupBy({ by: ['pais'], where: { fechaFin: { gte: desde } }, _count: true });
    const ps = await this.maestros.pais.findMany({ where: { siglasPais: { in: usados.map((u) => u.pais) } } });
    const n = new Map(usados.map((x) => [x.pais, x._count]));
    return ps
      .map((p) => ({ codigo: p.siglasPais, nombre: p.nombre, usos: n.get(p.siglasPais) ?? 0 }))
      .sort((a, b) => b.usos - a.usos);
  }

  async crearDae(u: UsuarioPortal, dto: DaeFincaDto) {
    const ids = await this.fincasDe(u);
    if (!ids.includes(dto.idFinca)) throw new ForbiddenException('Esa finca no está asignada a tu usuario.');
    const desde = new Date(`${dto.desde.slice(0, 10)}T00:00:00Z`);
    const hasta = new Date(`${dto.hasta.slice(0, 10)}T00:00:00Z`);
    if (hasta < desde) throw new BadRequestException('La fecha "hasta" es anterior a "desde".');
    const pais = await this.maestros.pais.findUnique({ where: { siglasPais: dto.pais.toUpperCase() } });
    if (!pais) throw new BadRequestException('País desconocido.');
    const r = await this.maestros.daeFinca.create({
      data: {
        idFinca: dto.idFinca,
        origen: 'UIO',
        pais: pais.siglasPais,
        fechaInicio: desde,
        fechaFin: hasta,
        dae: dto.dae,
        activa: true,
        registradoPor: u.username,
        registradoEn: new Date(),
      },
    });
    return { id: r.id };
  }

  async quitarDae(u: UsuarioPortal, idDae: number) {
    const ids = await this.fincasDe(u);
    const r = await this.maestros.daeFinca.findUnique({ where: { id: idDae } });
    if (!r || r.idFinca === null || !ids.includes(r.idFinca)) throw new NotFoundException('No encontramos esa DAE en tus fincas.');
    if (r.codigoAccess !== null) throw new ForbiddenException('Esa DAE viene del sistema viejo: se cambia allá.');
    await this.maestros.daeFinca.update({ where: { id: idDae }, data: { activa: false } });
    return { id: idDae, activa: false };
  }
}
