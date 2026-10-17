import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';

/**
 * Formularios de los datos maestros: qué campos se ven y se editan de cada
 * entidad, en qué orden y con qué nombre. El front los dibuja tal cual (ficha
 * de lectura y formulario), así que un campo nuevo se agrega solo aquí.
 *
 * `clave` es la ruta en el modelo Prisma: `nombre`, o `guiaM.guiaMNotify` para
 * una subtabla 1:1 (se hace upsert), o `aerolineasPlantilla.conceptos` para una
 * tabla hija (se reemplaza entera al grabar). Lo que no está aquí no se toca.
 */

export type TipoCampo = 'texto' | 'parrafo' | 'numero' | 'entero' | 'si-no' | 'opciones' | 'tabla';

export interface Opcion {
  valor: string | number;
  etiqueta: string;
  /** Texto secundario en la lista (código, RUC…). */
  detalle?: string | null;
  /** Registro desactivado: se muestra si ya estaba elegido, pero no se ofrece. */
  inactivo?: boolean;
}

export interface Campo {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido?: boolean;
  ayuda?: string;
  /** Largo máximo de texto. */
  max?: number;
  /** Se guarda en mayúsculas (sale impreso en guías y documentos). */
  mayusculas?: boolean;
  /** Ancho en el formulario de 6 columnas: 6 = toda la fila, 3 = media, 2 = un tercio. */
  ancho?: 1 | 2 | 3 | 4 | 6;
  /** Código que identifica el registro también en el sistema viejo: no se cambia después de crearlo. */
  soloAlCrear?: boolean;
  /** Valor inicial al crear. */
  inicial?: unknown;
  /** Unidad que se muestra junto al número (cm, $, kg). */
  unidad?: string;
  /** Opciones fijas, o de dónde salen (se resuelven al pedir el formulario). */
  opciones?: Opcion[];
  opcionesDe?: (db: PrismaMaestros) => Promise<Opcion[]>;
  /** Columnas de una tabla hija. */
  columnas?: Campo[];
}

export interface Seccion {
  titulo: string;
  descripcion?: string;
  /** Sección poco usada: se muestra plegada. */
  plegada?: boolean;
  campos: Campo[];
}

type DelegadoEdicion = {
  findUnique(args: unknown): Promise<Record<string, any> | null>;
  create(args: unknown): Promise<Record<string, any>>;
  update(args: unknown): Promise<Record<string, any>>;
};

export interface DefFormulario {
  /** "finca", "consignatario": para los mensajes. */
  singular: string;
  /** Femenino: "Nueva finca" / "Nuevo consignatario". */
  femenino?: boolean;
  /** Nombre de la entidad en el sync (SyncLegacyRegistro.entidad): dice si el registro viene del sistema viejo. */
  entidadSync: string;
  delegate: (db: PrismaMaestros) => DelegadoEdicion;
  pk?: string;
  secciones: Seccion[];
  /** Mensaje si choca un dato único (código repetido). */
  repetido?: string;
}

const activo = (femenino = false): Campo => ({
  clave: 'estado',
  etiqueta: femenino ? 'Activa' : 'Activo',
  tipo: 'si-no',
  inicial: true,
  ancho: 2,
  ayuda: femenino ? 'Si no está activa, no aparece al coordinar.' : 'Si no está activo, no aparece al coordinar.',
});

// ---- opciones que salen de la base (todas; las inactivas marcadas para no ofrecerlas) ----
const productos = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.producto.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, codigo: true, estado: true } })).map((p) => ({
    valor: p.id,
    etiqueta: p.nombre,
    detalle: p.codigo,
    inactivo: !p.estado,
  }));
const embarcadores = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.embarcador.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, ci: true, estado: true } })).map((e) => ({
    valor: e.id,
    etiqueta: e.nombre,
    detalle: e.ci,
    inactivo: !e.estado,
  }));
const clientes = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.cliente.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, ruc: true, estado: true } })).map((c) => ({
    valor: c.id,
    etiqueta: c.nombre,
    detalle: c.ruc,
    inactivo: !c.estado,
  }));
const destinos = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.destino.findMany({ orderBy: { codigo: 'asc' }, select: { id: true, codigo: true, nombre: true, estado: true } })).map((d) => ({
    valor: d.id,
    etiqueta: d.codigo ?? d.nombre ?? String(d.id),
    detalle: d.nombre,
    inactivo: !d.estado,
  }));
const paises = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.pais.findMany({ orderBy: { nombre: 'asc' }, select: { idPais: true, nombre: true, siglasPais: true, estado: true } })).map((p) => ({
    valor: p.idPais,
    etiqueta: p.nombre,
    detalle: p.siglasPais,
    inactivo: !p.estado,
  }));
const medidas = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.medida.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, estado: true } })).map((m) => ({
    valor: m.id,
    etiqueta: m.nombre,
    inactivo: !m.estado,
  }));
const tiposDocumento = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.tipoDocumentoIdentidad.findMany({ orderBy: { codigo: 'asc' } })).map((t) => ({ valor: String(t.codigo), etiqueta: t.nombre }));
const tiposCarga = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.tipoCarga.findMany({ orderBy: { nombre: 'asc' } })).map((t) => ({ valor: t.id, etiqueta: t.nombre, detalle: t.codigo }));
const tiposEmbalaje = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.tipoEmbalaje.findMany({ orderBy: { nombre: 'asc' } })).map((t) => ({ valor: t.id, etiqueta: t.nombre, detalle: t.codigo }));
const acuerdos = async (db: PrismaMaestros): Promise<Opcion[]> =>
  (await db.acuerdoArancelario.findMany({ orderBy: { nombre: 'asc' } })).map((a) => ({
    valor: a.idAcuerdo,
    etiqueta: a.nombre,
    detalle: a.tipoCertificado,
    inactivo: !a.estado,
  }));

// ---- bloques repetidos ----
const contacto = (prefijo = '', opts: { provincia?: boolean; siglas?: string } = {}): Campo[] => [
  { clave: `${prefijo}direccion`, etiqueta: 'Dirección', tipo: 'parrafo', mayusculas: true, ancho: 6, ayuda: 'Una línea por renglón, como se imprime.' },
  { clave: `${prefijo}telefono`, etiqueta: 'Teléfono', tipo: 'texto', ancho: 3 },
  { clave: `${prefijo}email`, etiqueta: 'Correo', tipo: 'texto', ancho: 3 },
  { clave: `${prefijo}ciudad`, etiqueta: 'Ciudad', tipo: 'texto', mayusculas: true, ancho: 2 },
  ...(opts.provincia ? [{ clave: `${prefijo}provincia`, etiqueta: 'Provincia', tipo: 'texto', mayusculas: true, ancho: 2 } as Campo] : []),
  { clave: `${prefijo}pais`, etiqueta: 'País', tipo: 'texto', mayusculas: true, ancho: 2 },
  ...(opts.siglas ? [{ clave: opts.siglas, etiqueta: 'Siglas del país', tipo: 'texto', mayusculas: true, max: 3, ancho: 2, ayuda: 'Ej. EC, NL, US.' } as Campo] : []),
];

const TIPOS_CONCEPTO: Opcion[] = [
  { valor: 'COSTO_GUIA', etiqueta: 'Costo de la guía' },
  { valor: 'COMBUSTIBLE', etiqueta: 'Combustible' },
  { valor: 'SEGURIDAD', etiqueta: 'Seguridad' },
  { valor: 'IVA', etiqueta: 'IVA' },
  { valor: 'OTROS', etiqueta: 'Otros' },
  { valor: 'AUX1', etiqueta: 'Auxiliar 1' },
  { valor: 'AUX2', etiqueta: 'Auxiliar 2' },
  { valor: 'AUX_CALCULO', etiqueta: 'Cálculo auxiliar' },
];

export const FORMULARIOS: Record<string, DefFormulario> = {
  fincas: {
    singular: 'finca',
    femenino: true,
    entidadSync: 'finca',
    delegate: (db) => db.finca as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Finca',
        campos: [
          { clave: 'nombreFinca', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 6 },
          { clave: 'tag', etiqueta: 'Alias', tipo: 'texto', mayusculas: true, ancho: 3, ayuda: 'Nombre corto: sale en las listas y en la guía madre.' },
          { clave: 'rucFinca', etiqueta: 'RUC', tipo: 'texto', ancho: 3, max: 20 },
          { clave: 'tipoDocumento', etiqueta: 'Tipo de documento', tipo: 'opciones', requerido: true, inicial: '1', opcionesDe: tiposDocumento, ancho: 3 },
          activo(true),
        ],
      },
      {
        titulo: 'Dirección y contacto',
        descripcion: 'La dirección sale como shipper en la guía hija.',
        campos: [
          { clave: 'direccion', etiqueta: 'Dirección', tipo: 'parrafo', mayusculas: true, ancho: 6, ayuda: 'Una línea por renglón, como se imprime.' },
          { clave: 'iGeneralTelefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 3 },
          { clave: 'iGeneralEmail', etiqueta: 'Correo', tipo: 'texto', ancho: 3 },
          { clave: 'iGeneralCiudad', etiqueta: 'Ciudad', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'iGeneralProvincia', etiqueta: 'Provincia', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'iGeneralPais', etiqueta: 'País', tipo: 'texto', mayusculas: true, ancho: 2, inicial: 'ECUADOR' },
          { clave: 'iGeneralCodPais', etiqueta: 'Siglas del país', tipo: 'texto', mayusculas: true, max: 3, ancho: 2, inicial: 'EC' },
        ],
      },
      {
        titulo: 'Caja full',
        descripcion: 'Medidas de la caja full: con ellas se calcula el volumen al coordinar.',
        campos: [
          { clave: 'cajaLargo', etiqueta: 'Largo', tipo: 'numero', unidad: 'cm', ancho: 2 },
          { clave: 'cajaAncho', etiqueta: 'Ancho', tipo: 'numero', unidad: 'cm', ancho: 2 },
          { clave: 'cajaAlto', etiqueta: 'Alto', tipo: 'numero', unidad: 'cm', ancho: 2 },
        ],
      },
      {
        titulo: 'Productos que vende',
        descripcion: 'Son los que la finca puede elegir al cargar en el portal.',
        campos: [
          {
            clave: 'fincasProductos',
            etiqueta: 'Productos',
            tipo: 'tabla',
            ancho: 6,
            columnas: [
              { clave: 'idProducto', etiqueta: 'Producto', tipo: 'opciones', requerido: true, opcionesDe: productos, ancho: 3 },
              { clave: 'nombre', etiqueta: 'Nombre con que lo vende', tipo: 'texto', mayusculas: true, ancho: 3 },
            ],
          },
        ],
      },
      {
        titulo: 'Agrocalidad',
        plegada: true,
        campos: [
          { clave: 'aCodigo', etiqueta: 'Código Agrocalidad', tipo: 'texto', mayusculas: true, ancho: 3 },
          { clave: 'iGeneralCodSesa', etiqueta: 'Código SESA', tipo: 'texto', ancho: 3 },
          { clave: 'aNombre', etiqueta: 'Razón social', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'aDireccion', etiqueta: 'Dirección', tipo: 'texto', mayusculas: true, ancho: 6 },
        ],
      },
    ],
  },

  consignatarios: {
    singular: 'consignatario',
    entidadSync: 'consignatario',
    delegate: (db) => db.consignatario as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Marca',
        campos: [
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 6 },
          { clave: 'alias', etiqueta: 'Alias', tipo: 'texto', mayusculas: true, ancho: 3 },
          { clave: 'ruc', etiqueta: 'RUC / documento', tipo: 'texto', ancho: 3 },
          { clave: 'idEmbarcador', etiqueta: 'Embarcador', tipo: 'opciones', opcionesDe: embarcadores, ancho: 3, ayuda: 'Dueño de la carga: sale como shipper en la guía madre.' },
          { clave: 'idCliente', etiqueta: 'Cliente', tipo: 'opciones', opcionesDe: clientes, ancho: 3, ayuda: 'A quién se le cobra: de aquí sale el handling.' },
          activo(),
        ],
      },
      {
        titulo: 'Guía madre',
        descripcion: 'Así sale en la guía madre.',
        campos: [
          { clave: 'guiaM.guiaMNameAddress', etiqueta: 'Consignee', tipo: 'parrafo', mayusculas: true, ancho: 6, ayuda: 'Nombre y dirección, una línea por renglón.' },
          { clave: 'guiaM.guiaMNotify', etiqueta: 'Notify', tipo: 'parrafo', mayusculas: true, ancho: 6 },
          { clave: 'guiaM.guiaMConsignee', etiqueta: 'Consignee (nombre corto)', tipo: 'texto', mayusculas: true, ancho: 3 },
          { clave: 'guiaM.idDestino', etiqueta: 'Destino por defecto', tipo: 'opciones', opcionesDe: destinos, ancho: 3, ayuda: 'Se propone al coordinar.' },
        ],
      },
      {
        titulo: 'Guía hija',
        descripcion: 'Así sale en las guías hijas de cada finca.',
        campos: [
          { clave: 'guiaH.guiaHNameAdress', etiqueta: 'Consignee', tipo: 'parrafo', mayusculas: true, ancho: 6, ayuda: 'Nombre y dirección, una línea por renglón.' },
          { clave: 'guiaH.guiaHNotify', etiqueta: 'Notify', tipo: 'parrafo', mayusculas: true, ancho: 6 },
          { clave: 'guiaH.guiaHConsignee', etiqueta: 'Consignee (nombre corto)', tipo: 'texto', mayusculas: true, ancho: 3 },
        ],
      },
      {
        titulo: 'Contacto',
        plegada: true,
        campos: contacto('', { siglas: 'paisSigla' }),
      },
      {
        titulo: 'ECUAPASS',
        descripcion: 'Datos de aduana; los de la guía hija van en el archivo de FlowerCargo.',
        plegada: true,
        campos: [
          { clave: 'caeSice.hawbNombre', etiqueta: 'Guía hija · nombre', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'caeSice.hawbDireccion', etiqueta: 'Guía hija · dirección', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'caeSice.hawbTipoDocumento', etiqueta: 'Tipo de documento', tipo: 'texto', ancho: 2 },
          { clave: 'caeSice.hawbDocumento', etiqueta: 'Documento', tipo: 'texto', ancho: 2 },
          { clave: 'caeSice.hawbSiglasPais', etiqueta: 'Siglas del país', tipo: 'texto', mayusculas: true, max: 3, ancho: 2 },
          { clave: 'caeSice.consigneeNombre', etiqueta: 'Consignee · nombre', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'caeSice.consigneeDireccion', etiqueta: 'Consignee · dirección', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'caeSice.consigneeTipoDocumento', etiqueta: 'Tipo de documento', tipo: 'texto', ancho: 2 },
          { clave: 'caeSice.consigneeDocumento', etiqueta: 'Documento', tipo: 'texto', ancho: 2 },
          { clave: 'caeSice.consigneeSiglasPais', etiqueta: 'Siglas del país', tipo: 'texto', mayusculas: true, max: 3, ancho: 2 },
          { clave: 'caeSice.notifyNombre', etiqueta: 'Notify · nombre', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'caeSice.notifyDireccion', etiqueta: 'Notify · dirección', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'caeSice.notifyTipoDocumento', etiqueta: 'Tipo de documento', tipo: 'texto', ancho: 2 },
          { clave: 'caeSice.notifyDocumento', etiqueta: 'Documento', tipo: 'texto', ancho: 2 },
          { clave: 'caeSice.notifySiglasPais', etiqueta: 'Siglas del país', tipo: 'texto', mayusculas: true, max: 3, ancho: 2 },
        ],
      },
      {
        titulo: 'Facturación',
        plegada: true,
        campos: [
          { clave: 'facturacion.facturaNombre', etiqueta: 'Nombre', tipo: 'texto', mayusculas: true, ancho: 4 },
          { clave: 'facturacion.facturaRuc', etiqueta: 'RUC', tipo: 'texto', ancho: 2 },
          { clave: 'facturacion.facturaDireccion', etiqueta: 'Dirección', tipo: 'parrafo', mayusculas: true, ancho: 6 },
          { clave: 'facturacion.facturaTelefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 3 },
        ],
      },
      {
        titulo: 'FITO y Form A',
        plegada: true,
        campos: [
          { clave: 'fito.fitoNombre', etiqueta: 'FITO · nombre', tipo: 'texto', mayusculas: true, ancho: 6 },
          { clave: 'fito.fitoDireccion', etiqueta: 'FITO · dirección', tipo: 'parrafo', mayusculas: true, ancho: 6 },
          { clave: 'fito.fitoDeclaredName', etiqueta: 'Nombre declarado', tipo: 'texto', mayusculas: true, ancho: 3 },
          { clave: 'fito.fitoDeclaredAddress', etiqueta: 'Dirección declarada', tipo: 'texto', mayusculas: true, ancho: 3 },
          { clave: 'fito.fitoPais', etiqueta: 'País', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'fito.fitoFormaA', etiqueta: 'Form A', tipo: 'parrafo', mayusculas: true, ancho: 6 },
        ],
      },
    ],
  },

  embarcadores: {
    singular: 'embarcador',
    entidadSync: 'embarcador',
    delegate: (db) => db.embarcador as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Embarcador',
        descripcion: 'Dueño de la carga: sale como shipper en la guía madre.',
        campos: [
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 6 },
          { clave: 'alias', etiqueta: 'Alias', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'ci', etiqueta: 'RUC', tipo: 'texto', ancho: 2, ayuda: 'Como se imprime, ej. "RUC 1792169704001".' },
          { clave: 'handling', etiqueta: 'Handling', tipo: 'numero', unidad: '$', ancho: 2 },
          activo(),
        ],
      },
      { titulo: 'Dirección y contacto', campos: contacto('', { provincia: true, siglas: 'embarcadorCodigoPais' }) },
    ],
  },

  clientes: {
    singular: 'cliente',
    entidadSync: 'cliente',
    delegate: (db) => db.cliente as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Cliente',
        campos: [
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 6 },
          { clave: 'alias', etiqueta: 'Alias', tipo: 'texto', mayusculas: true, ancho: 3 },
          { clave: 'ruc', etiqueta: 'RUC', tipo: 'texto', ancho: 3 },
          activo(),
        ],
      },
      {
        titulo: 'Lo que se le cobra',
        descripcion: 'Se proponen al coordinar en el cobro al cliente.',
        campos: [
          { clave: 'handling', etiqueta: 'Handling', tipo: 'numero', unidad: '$', ancho: 2 },
          { clave: 'fitosValor', etiqueta: 'FITO', tipo: 'numero', unidad: '$', ancho: 2 },
          { clave: 'formA', etiqueta: 'Form A', tipo: 'entero', unidad: '$', ancho: 2 },
          { clave: 'transport', etiqueta: 'Transporte', tipo: 'entero', unidad: '$', ancho: 2 },
          { clave: 'termo', etiqueta: 'Termógrafo', tipo: 'entero', unidad: '$', ancho: 2 },
          { clave: 'mica', etiqueta: 'MCA', tipo: 'entero', unidad: '$', ancho: 2 },
        ],
      },
      { titulo: 'Dirección y contacto', plegada: true, campos: contacto('', { siglas: 'clienteCodigoPais' }) },
      {
        titulo: 'Facturación',
        plegada: true,
        campos: [
          { clave: 'nombreFactura', etiqueta: 'Nombre', tipo: 'texto', mayusculas: true, ancho: 4 },
          { clave: 'rucFactura', etiqueta: 'RUC', tipo: 'texto', ancho: 2 },
          { clave: 'direccionFactura', etiqueta: 'Dirección', tipo: 'parrafo', mayusculas: true, ancho: 6 },
          { clave: 'telefonoFactura', etiqueta: 'Teléfono', tipo: 'texto', ancho: 3 },
          { clave: 'cuentaContable', etiqueta: 'Cuenta contable', tipo: 'texto', ancho: 3 },
        ],
      },
    ],
  },

  productos: {
    singular: 'producto',
    entidadSync: 'producto',
    delegate: (db) => db.producto as unknown as DelegadoEdicion,
    repetido: 'Ya hay un producto con ese código.',
    secciones: [
      {
        titulo: 'Producto',
        campos: [
          { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, mayusculas: true, soloAlCrear: true, max: 20, ancho: 2, ayuda: 'Ej. ROSAS. No se cambia después.' },
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 4 },
          { clave: 'medidaId', etiqueta: 'Unidad', tipo: 'opciones', requerido: true, opcionesDe: medidas, ancho: 2 },
          { clave: 'stemsPorFull', etiqueta: 'Tallos por full', tipo: 'entero', ancho: 2 },
          { clave: 'precioUnitario', etiqueta: 'Precio unitario', tipo: 'numero', unidad: '$', ancho: 2 },
          { clave: 'nombreBotanico', etiqueta: 'Nombre botánico', tipo: 'texto', ancho: 3 },
          { clave: 'especie', etiqueta: 'Especie', tipo: 'texto', ancho: 3 },
          { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'texto', ancho: 6 },
          activo(),
        ],
      },
    ],
  },

  aerolineas: {
    singular: 'aerolínea',
    femenino: true,
    entidadSync: 'aerolinea',
    delegate: (db) => db.aerolinea as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Aerolínea',
        campos: [
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 4 },
          { clave: 'alias', etiqueta: 'Alias', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'prefijoAwb', etiqueta: 'Prefijo de guía', tipo: 'texto', max: 3, ancho: 2, ayuda: 'Ej. 369 (ATLAS).' },
          { clave: 'codigo', etiqueta: 'Código IATA', tipo: 'texto', mayusculas: true, max: 3, ancho: 2, ayuda: 'Dos letras, ej. 5Y.' },
          { clave: 'ciRuc', etiqueta: 'RUC', tipo: 'texto', ancho: 2 },
          {
            clave: 'modo',
            etiqueta: 'Cobra',
            tipo: 'opciones',
            ancho: 2,
            inicial: 'EN_PIEZAS',
            opciones: [
              { valor: 'EN_PIEZAS', etiqueta: 'En piezas' },
              { valor: 'EN_FULLES', etiqueta: 'En fulls' },
            ],
          },
          { clave: 'guiasVirtuales', etiqueta: 'Guías virtuales', tipo: 'si-no', inicial: true, ancho: 2, ayuda: 'Al ingresar guías se propone stock virtual.' },
          activo(true),
        ],
      },
      {
        titulo: 'Tarifa y cargos',
        descripcion: 'Se proponen al coordinar una guía de esta aerolínea.',
        campos: [
          { clave: 'aerolineasPlantilla.tarifaRate', etiqueta: 'Tarifa por kilo', tipo: 'numero', unidad: '$', ancho: 2 },
          { clave: 'aerolineasPlantilla.pca', etiqueta: 'PCA', tipo: 'numero', unidad: '$', ancho: 2 },
          {
            clave: 'aerolineasPlantilla.conceptos',
            etiqueta: 'Cargos de la aerolínea',
            tipo: 'tabla',
            ancho: 6,
            columnas: [
              { clave: 'tipo', etiqueta: 'Cargo', tipo: 'opciones', requerido: true, opciones: TIPOS_CONCEPTO, ancho: 2 },
              { clave: 'abreviatura', etiqueta: 'Código en la guía', tipo: 'texto', mayusculas: true, max: 6, ancho: 1 },
              { clave: 'valor', etiqueta: 'Valor', tipo: 'numero', unidad: '$', ancho: 1 },
              {
                clave: 'multiplicador',
                etiqueta: 'Por kilo de',
                tipo: 'opciones',
                ancho: 2,
                opciones: [
                  { valor: 'GROSS_WEIGHT', etiqueta: 'Peso bruto' },
                  { valor: 'CHARGEABLE_WEIGHT', etiqueta: 'Peso cobrable' },
                ],
              },
            ],
          },
        ],
      },
      { titulo: 'Contacto', plegada: true, campos: [...contacto(), { clave: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', ancho: 3 }] },
      {
        titulo: 'Impresión y reservas',
        plegada: true,
        campos: [
          { clave: 'aerolineasPlantilla.plantillaGuiaMadre', etiqueta: 'Formato de guía madre', tipo: 'texto', ancho: 3, ayuda: 'Nombre del formato del sistema viejo, ej. GMATLAS VIRTUAL.' },
          { clave: 'codigoCae', etiqueta: 'Código CAE', tipo: 'texto', ancho: 3 },
          { clave: 'afiliadoCass', etiqueta: 'Afiliada a CASS', tipo: 'si-no', ancho: 2 },
          { clave: 'reservasDestinatarios', etiqueta: 'Correo para reservas', tipo: 'texto', ancho: 6 },
          { clave: 'reservasNombreContacto', etiqueta: 'Nombre del contacto de reservas', tipo: 'texto', ancho: 3 },
          { clave: 'reservasAsunto', etiqueta: 'Asunto del correo de reservas', tipo: 'texto', ancho: 3 },
        ],
      },
    ],
  },

  agencias: {
    singular: 'agencia IATA',
    femenino: true,
    entidadSync: 'agenciaIata',
    delegate: (db) => db.agenciaIata as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Agencia',
        campos: [
          { clave: 'nombreShipper', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 4 },
          { clave: 'alias', etiqueta: 'Alias', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'rucShipper', etiqueta: 'RUC', tipo: 'texto', ancho: 2 },
          { clave: 'comision', etiqueta: 'Comisión', tipo: 'numero', unidad: '%', ancho: 2 },
          activo(true),
        ],
      },
      {
        titulo: 'Como agente emisor',
        descripcion: 'Así sale en la guía madre ("Issuing Carrier\'s Agent").',
        campos: [
          { clave: 'nombreCarrier', etiqueta: 'Nombre', tipo: 'texto', mayusculas: true, ancho: 4 },
          { clave: 'rucCarrier', etiqueta: 'RUC', tipo: 'texto', ancho: 2 },
          { clave: 'iataCodeCarrier', etiqueta: 'Código IATA', tipo: 'texto', ancho: 2, ayuda: 'Ej. 79-1-0037-0016.' },
          { clave: 'direccionCarrier', etiqueta: 'Dirección', tipo: 'parrafo', mayusculas: true, ancho: 6 },
          { clave: 'telefonoCarrier', etiqueta: 'Teléfono', tipo: 'texto', ancho: 2 },
          { clave: 'ciudadCarrier', etiqueta: 'Ciudad', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'paisCarrier', etiqueta: 'País', tipo: 'texto', mayusculas: true, ancho: 2 },
        ],
      },
      {
        titulo: 'Como shipper',
        plegada: true,
        campos: [
          { clave: 'direccionShipper', etiqueta: 'Dirección', tipo: 'parrafo', mayusculas: true, ancho: 6 },
          { clave: 'telefonoShipper', etiqueta: 'Teléfono', tipo: 'texto', ancho: 2 },
          { clave: 'ciudadShipper', etiqueta: 'Ciudad', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'paisShipper', etiqueta: 'País', tipo: 'texto', mayusculas: true, ancho: 2 },
        ],
      },
      {
        titulo: 'Aduana',
        plegada: true,
        campos: [
          { clave: 'registroExportador', etiqueta: 'Registro de exportador', tipo: 'texto', ancho: 2 },
          { clave: 'codigoOperador', etiqueta: 'Código de operador', tipo: 'texto', ancho: 2 },
          { clave: 'codigoConsolidador', etiqueta: 'Código de consolidador', tipo: 'texto', ancho: 2 },
        ],
      },
    ],
  },

  subagencias: {
    singular: 'subagencia',
    femenino: true,
    entidadSync: 'subAgencia',
    delegate: (db) => db.subAgencia as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Subagencia',
        campos: [
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 4 },
          { clave: 'alias', etiqueta: 'Alias', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'ciRuc', etiqueta: 'RUC', tipo: 'texto', ancho: 2 },
          { clave: 'representante', etiqueta: 'Representante', tipo: 'texto', ancho: 2 },
          { clave: 'comision', etiqueta: 'Comisión', tipo: 'numero', unidad: '%', ancho: 2 },
          activo(true),
        ],
      },
      { titulo: 'Dirección y contacto', campos: contacto('', { provincia: true }) },
    ],
  },

  destinos: {
    singular: 'destino',
    entidadSync: 'destino',
    delegate: (db) => db.destino as unknown as DelegadoEdicion,
    repetido: 'Ya hay un destino con ese código.',
    secciones: [
      {
        titulo: 'Destino',
        campos: [
          { clave: 'codigo', etiqueta: 'Código IATA', tipo: 'texto', requerido: true, mayusculas: true, soloAlCrear: true, max: 3, ancho: 2, ayuda: 'Ej. AMS. No se cambia después.' },
          { clave: 'nombre', etiqueta: 'Ciudad', tipo: 'texto', mayusculas: true, ancho: 4 },
          { clave: 'aeropuerto', etiqueta: 'Aeropuerto', tipo: 'texto', mayusculas: true, ancho: 4, ayuda: 'Como sale en la guía, ej. AMSTERDAM HOLLAND.' },
          { clave: 'idPais', etiqueta: 'País', tipo: 'opciones', opcionesDe: paises, ancho: 2 },
          { clave: 'cobroFitos', etiqueta: 'Cobra FITO', tipo: 'si-no', ancho: 2 },
          { clave: 'sesaId', etiqueta: 'Código SESA', tipo: 'texto', ancho: 2 },
          activo(),
          { clave: 'leyendaFito', etiqueta: 'Leyenda para el FITO', tipo: 'parrafo', ancho: 6 },
        ],
      },
    ],
  },

  paises: {
    singular: 'país',
    entidadSync: 'pais',
    pk: 'idPais',
    delegate: (db) => db.pais as unknown as DelegadoEdicion,
    repetido: 'Ya hay un país con esas siglas.',
    secciones: [
      {
        titulo: 'País',
        campos: [
          { clave: 'siglasPais', etiqueta: 'Siglas', tipo: 'texto', requerido: true, mayusculas: true, soloAlCrear: true, max: 3, ancho: 2, ayuda: 'Ej. NL. No se cambian después.' },
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 4 },
          { clave: 'idAcuerdo', etiqueta: 'Acuerdo arancelario', tipo: 'opciones', opcionesDe: acuerdos, ancho: 4 },
          activo(),
        ],
      },
    ],
  },

  'tipos-embarque': {
    singular: 'tipo de embarque',
    entidadSync: 'tipoEmbarque',
    delegate: (db) => db.tipoEmbarque as unknown as DelegadoEdicion,
    repetido: 'Ya hay un tipo de embarque con ese código.',
    secciones: [
      {
        titulo: 'Tipo de embarque',
        campos: [
          { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, mayusculas: true, soloAlCrear: true, max: 20, ancho: 2, ayuda: 'Ej. FLORES. No se cambia después.' },
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 4 },
          { clave: 'descripcionGuia', etiqueta: 'Texto en la guía', tipo: 'parrafo', mayusculas: true, ancho: 6, ayuda: '"Nature and quantity of goods": una línea por renglón.' },
          { clave: 'idTipoCarga', etiqueta: 'Tipo de carga (ECUAPASS)', tipo: 'opciones', opcionesDe: tiposCarga, ancho: 3 },
          { clave: 'idTipoEmbalaje', etiqueta: 'Embalaje (ECUAPASS)', tipo: 'opciones', opcionesDe: tiposEmbalaje, ancho: 3 },
          { clave: 'mercancia', etiqueta: 'Mercancía', tipo: 'texto', ancho: 3 },
          { clave: 'regimen', etiqueta: 'Régimen', tipo: 'texto', ancho: 3 },
          { clave: 'harmonisedCommodity', etiqueta: 'Partida (HS)', tipo: 'texto', ancho: 3 },
          { clave: 'orden', etiqueta: 'Orden en las listas', tipo: 'entero', ancho: 3 },
        ],
      },
    ],
  },

  choferes: {
    singular: 'chofer',
    entidadSync: 'chofer',
    delegate: (db) => db.chofer as unknown as DelegadoEdicion,
    secciones: [
      {
        titulo: 'Chofer',
        campos: [
          { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, mayusculas: true, ancho: 4 },
          { clave: 'ruc', etiqueta: 'Cédula / RUC', tipo: 'texto', requerido: true, ancho: 2 },
          { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 2 },
          { clave: 'placasCamion', etiqueta: 'Placa', tipo: 'texto', mayusculas: true, ancho: 2 },
          { clave: 'camion', etiqueta: 'Camión', tipo: 'texto', mayusculas: true, ancho: 2 },
          activo(),
        ],
      },
    ],
  },
};
