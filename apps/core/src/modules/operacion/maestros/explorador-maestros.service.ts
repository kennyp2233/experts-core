import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';

/** Fila de la lista del explorador (igual para todas las entidades). */
export interface FilaMaestro {
  id: number | string;
  codigo: string | null;
  nombre: string;
  detalle: string | null;
  activo: boolean | null;
}

type Delegate = {
  count(args: { where?: unknown }): Promise<number>;
  findMany(args: unknown): Promise<Record<string, any>[]>;
  findUnique(args: unknown): Promise<Record<string, any> | null>;
};

interface DefEntidad {
  titulo: string;
  descripcion: string;
  grupo: 'Comercial' | 'Operación' | 'Geografía' | 'Productos' | 'Personas' | 'Sistema';
  delegate: (db: PrismaMaestros) => Delegate;
  /** Campos de texto donde busca `q`. */
  buscar: string[];
  orden: Record<string, 'asc' | 'desc'>[];
  fila: (r: Record<string, any>) => FilaMaestro;
  /** Relaciones a incluir en la ficha. */
  include?: Record<string, unknown>;
  /** Clave primaria si no es `id`. */
  pk?: string;
}

const s = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v));

/**
 * Explorador de solo lectura de los datos maestros (vienen del sistema viejo
 * por el sync; en PG no se editan mientras Access mande).
 */
const ENTIDADES: Record<string, DefEntidad> = {
  consignatarios: {
    titulo: 'Consignatarios (marcas)',
    descripcion: 'Marcaciones: a quién va la carga, con sus datos para guías, FITO, ECUAPASS y facturación.',
    grupo: 'Comercial',
    delegate: (db) => db.consignatario as unknown as Delegate,
    buscar: ['nombre', 'alias', 'ruc'],
    orden: [{ nombre: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.codigoAccess), nombre: r.nombre, detalle: s(r.alias), activo: r.estado }),
    include: { caeSice: true, facturacion: true, fito: true, guiaH: true, guiaM: true, transmision: true, embarcador: true, cliente: true },
  },
  clientes: {
    titulo: 'Clientes',
    descripcion: 'Clientes con sus tarifas de servicios (FITO, Form A, transporte, handling) y datos de facturación.',
    grupo: 'Comercial',
    delegate: (db) => db.cliente as unknown as Delegate,
    buscar: ['nombre', 'alias', 'ruc'],
    orden: [{ nombre: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.codigoAccess), nombre: r.nombre, detalle: s(r.ruc), activo: r.estado }),
  },
  embarcadores: {
    titulo: 'Embarcadores',
    descripcion: 'Dueños de la carga (en el sistema viejo: "clientes").',
    grupo: 'Comercial',
    delegate: (db) => db.embarcador as unknown as Delegate,
    buscar: ['nombre', 'alias', 'ci'],
    orden: [{ nombre: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.codigoAccess), nombre: r.nombre, detalle: s(r.ciudad), activo: r.estado }),
  },
  fincas: {
    titulo: 'Fincas',
    descripcion: 'Plantaciones exportadoras: RUC, dirección, código Agrocalidad, medidas de caja.',
    grupo: 'Comercial',
    delegate: (db) => db.finca as unknown as Delegate,
    buscar: ['nombreFinca', 'tag', 'rucFinca'],
    orden: [{ nombreFinca: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.rucFinca), nombre: r.nombreFinca, detalle: s(r.iGeneralCiudad), activo: r.estado }),
    include: { fincasProductos: { include: { producto: { select: { codigo: true, nombre: true } } } }, registrosAgrocalidad: true },
  },
  aerolineas: {
    titulo: 'Aerolíneas',
    descripcion: 'Transportistas: código IATA, prefijo AWB, conceptos de costo y ruta.',
    grupo: 'Operación',
    delegate: (db) => db.aerolinea as unknown as Delegate,
    buscar: ['nombre', 'alias', 'codigo', 'prefijoAwb'],
    orden: [{ nombre: 'asc' }],
    fila: (r) => ({
      id: r.id,
      codigo: s(r.codigo),
      nombre: r.nombre,
      detalle: r.prefijoAwb ? `Prefijo ${r.prefijoAwb}` : null,
      activo: r.estado,
    }),
    include: { aerolineasPlantilla: { include: { conceptos: true } }, rutas: true },
  },
  agencias: {
    titulo: 'Agencias IATA',
    descripcion: 'Agencias de carga (shipper / carrier) con sus códigos CAE y comisión.',
    grupo: 'Operación',
    delegate: (db) => db.agenciaIata as unknown as Delegate,
    buscar: ['nombreShipper', 'alias', 'rucShipper'],
    orden: [{ nombreShipper: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.iataCodeCarrier), nombre: r.nombreShipper, detalle: s(r.alias), activo: r.estado }),
  },
  subagencias: {
    titulo: 'Subagencias',
    descripcion: 'Subagencias y su comisión.',
    grupo: 'Operación',
    delegate: (db) => db.subAgencia as unknown as Delegate,
    buscar: ['nombre', 'alias'],
    orden: [{ nombre: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.codigoAccess), nombre: r.nombre, detalle: s(r.alias), activo: r.estado }),
  },
  'tipos-embarque': {
    titulo: 'Tipos de embarque',
    descripcion: 'Qué se embarca (flores, …) con su tipo de carga y embalaje ECUAPASS.',
    grupo: 'Operación',
    delegate: (db) => db.tipoEmbarque as unknown as Delegate,
    buscar: ['nombre', 'codigo', 'mercancia'],
    orden: [{ orden: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.codigo), nombre: r.nombre, detalle: s(r.mercancia), activo: null }),
    include: { carga: true, embalaje: true },
  },
  choferes: {
    titulo: 'Choferes',
    descripcion: 'Choferes y camiones.',
    grupo: 'Personas',
    delegate: (db) => db.chofer as unknown as Delegate,
    buscar: ['nombre', 'ruc', 'placasCamion'],
    orden: [{ nombre: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.placasCamion), nombre: r.nombre, detalle: s(r.camion), activo: r.estado }),
  },
  productos: {
    titulo: 'Productos',
    descripcion: 'Flores: nombre botánico, tallos por full, partidas arancelarias por destino.',
    grupo: 'Productos',
    delegate: (db) => db.producto as unknown as Delegate,
    buscar: ['nombre', 'codigo', 'nombreBotanico'],
    orden: [{ nombre: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.codigo), nombre: r.nombre, detalle: s(r.nombreBotanico), activo: r.estado }),
    include: { medida: true, productosAranceles: true, productosCompuestos: true, productosMiPros: true, componentes: true },
  },
  destinos: {
    titulo: 'Destinos',
    descripcion: 'Aeropuertos de destino (código IATA) y su leyenda para el FITO.',
    grupo: 'Geografía',
    delegate: (db) => db.destino as unknown as Delegate,
    buscar: ['nombre', 'codigo', 'aeropuerto'],
    orden: [{ codigo: 'asc' }],
    fila: (r) => ({ id: r.id, codigo: s(r.codigo), nombre: r.nombre ?? r.codigo ?? '', detalle: s(r.aeropuerto), activo: r.estado }),
    include: { pais: true },
  },
  paises: {
    titulo: 'Países',
    descripcion: 'Países y su acuerdo arancelario.',
    grupo: 'Geografía',
    delegate: (db) => db.pais as unknown as Delegate,
    buscar: ['nombre', 'siglasPais'],
    orden: [{ nombre: 'asc' }],
    pk: 'idPais',
    fila: (r) => ({ id: r.idPais, codigo: s(r.siglasPais), nombre: r.nombre, detalle: null, activo: r.estado }),
    include: { acuerdo: true },
  },
  parametros: {
    titulo: 'Parámetros',
    descripcion: 'Parámetros del negocio del sistema viejo (tarifas, factores, datos de la empresa, contador de guías hijas).',
    grupo: 'Sistema',
    delegate: (db) => db.parametro as unknown as Delegate,
    buscar: ['clave', 'descripcion', 'valorTexto'],
    orden: [{ clave: 'asc' }],
    pk: 'clave',
    fila: (r) => ({
      id: r.clave,
      codigo: r.fuente,
      nombre: r.clave,
      detalle: r.valorNumero !== null ? String(r.valorNumero) : s(r.valorTexto),
      activo: null,
    }),
  },
};

@Injectable()
export class ExploradorMaestrosService {
  constructor(@Inject('PrismaClientDatosMaestros') private readonly db: PrismaMaestros) {}

  private def(entidad: string): DefEntidad {
    const d = ENTIDADES[entidad];
    if (!d) throw new BadRequestException(`Entidad desconocida: ${entidad}. Opciones: ${Object.keys(ENTIDADES).join(', ')}`);
    return d;
  }

  /** Entidades disponibles con su cantidad de registros. */
  async entidades() {
    return Promise.all(
      Object.entries(ENTIDADES).map(async ([clave, d]) => ({
        clave,
        titulo: d.titulo,
        descripcion: d.descripcion,
        grupo: d.grupo,
        total: await d.delegate(this.db).count({}),
      })),
    );
  }

  async listar(entidad: string, q: string | undefined, page = 1, pageSize = 50) {
    const d = this.def(entidad);
    const texto = q?.trim();
    const where = texto
      ? { OR: d.buscar.map((campo) => ({ [campo]: { contains: texto, mode: 'insensitive' } })) }
      : undefined;
    const del = d.delegate(this.db);
    const [total, filas] = await Promise.all([
      del.count({ where }),
      del.findMany({ where, orderBy: d.orden, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { titulo: d.titulo, descripcion: d.descripcion, items: filas.map(d.fila), total, page, pageSize };
  }

  async ficha(entidad: string, id: string) {
    const d = this.def(entidad);
    const pk = d.pk ?? 'id';
    const valor = pk === 'clave' ? id : Number(id);
    if (pk !== 'clave' && !Number.isFinite(valor)) throw new BadRequestException('id inválido');
    const r = await d.delegate(this.db).findUnique({ where: { [pk]: valor }, include: d.include });
    if (!r) throw new NotFoundException(`${d.titulo}: ${id} no encontrado`);
    return { titulo: d.titulo, fila: d.fila(r), registro: r };
  }
}
