import type {
  CompoundFormsetConfig,
  ProductoOption,
} from './coordinacion-create.types';

/** Campos read-only que el modal de update muestra como contexto. */
export interface UpdateFormContext {
  exportador: string | null;
  marcacion: string | null;
  cliente: string | null;
  despacho: string | null; // fecha vuelo (string)
  awb: string | null;
  hawb: string | null;
  dae: string | null;
}

/** Spec parseada del modal "Editar EBF... (detalleId)". */
export interface UpdateFormSpec {
  detalleId: number;
  csrfToken: string;
  context: UpdateFormContext;
  /** Productos disponibles para cambiar (mismos flags que en create). */
  productos: ProductoOption[];
  /** ID del producto actualmente seleccionado. */
  currentProductoId: number | null;
  /**
   * true cuando el portal bloquea el cambio de producto porque ya hay
   * transacciones de bodega registradas. El modal muestra un aviso y
   * envía el producto como read-only.
   */
  productoLocked: boolean;
  compoundFormset: CompoundFormsetConfig;
  /** Valores numéricos actuales (los que vamos a poder editar). */
  currentValues: {
    fbCoo: number;
    hbCoo: number;
    qbCoo: number;
    ebCoo: number;
    bxsCoo: number;
    pcsCoo: number;
  };
}

/** Resultado del POST update — misma forma que create. */
export interface UpdateCoordinacionResult {
  ok: boolean;
  status: number;
  redirectTo?: string | null;
  errors?: string[];
  rawHtml?: string;
}

/** Resultado del DELETE — minimal. */
export interface DeleteCoordinacionResult {
  ok: boolean;
  status: number;
  redirectTo?: string | null;
  errors?: string[];
}
