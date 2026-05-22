/** Item de un <select> del cascade (exportador → marcación → vuelo → DAE). */
export interface SelectOption {
  value: string;
  label: string;
  /** data-* attrs preservados (ej. data-suffix en vuelo). */
  data?: Record<string, string>;
}

/** Card "Detalle del Vuelo" — lado derecho de la página coordinar. */
export interface VueloCard {
  exportador: string | null;
  cliente: string | null;
  id: string | null;
  fechaVuelo: string | null;
  ruta: string | null;
  aerolinea: string | null;
}

/** Producto disponible para coordinar, con flags que cambian el comportamiento del form. */
export interface ProductoOption {
  value: string;
  label: string;
  isFullBxs: boolean;
  isCompoundProduct: boolean;
  errorMessage: string | null;
}

/** Hidden inputs del modal (replicados del form de selección que abrió el dialog). */
export interface CreateFormHidden {
  exportador: string;
  consignatarioMarcacion: string;
  docCoordinacion: string;
  dae: string;
}

/** Config del formset django-dynamic-formset para productos compuestos. */
export interface CompoundFormsetConfig {
  prefix: string;
  totalForms: number;
  initialForms: number;
  minNumForms: number;
  maxNumForms: number;
  productoOptions: SelectOption[];
}

/** Especificación parseada del modal "Crear Detalle De Coordinación". */
export interface CreateFormSpec {
  csrfToken: string;
  hidden: CreateFormHidden;
  productos: ProductoOption[];
  compoundFormset: CompoundFormsetConfig;
  /** Visibilidad inicial de cada input numérico (fb readonly salvo isFullBxs=true). */
  initialNumericValues: {
    fbCoo: number;
    hbCoo: number;
    qbCoo: number;
    ebCoo: number;
    bxsCoo: number;
    pcsCoo: number;
  };
}

/** Input del endpoint /exportador/box_weight_factor_calculator/. */
export interface BoxWeightInput {
  fb_coo: number;
  hb_coo: number;
  qb_coo: number;
  eb_coo: number;
}

/** Respuesta del calculador (totales server-side). */
export interface BoxWeightResult {
  bxs_coo: number;
  pcs_coo: number;
}

/** Resultado del submit a /exportador/detalle/create/. */
export interface CreateCoordinacionResult {
  ok: boolean;
  status: number;
  /** Si el portal redirige al éxito (302) — destino. */
  redirectTo?: string | null;
  /** Si el portal devuelve 200 con form recargado, los mensajes de error parseados (vacío si OK). */
  errors?: string[];
  /** HTML crudo de la respuesta — útil para debug y auditoría. */
  rawHtml?: string;
}
