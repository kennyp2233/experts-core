export interface CoordinacionListItem {
  etd: string | null;
  awb: string | null;
  exportador: string | null;
  marcacion: string | null;
  producto: string | null;
  dae: string | null;
  hawb: string | null;
  bxsCoo: string | null;
  pcsCoo: string | null;
  bxsWh: string | null;
  pcsWh: string | null;
  origen: string | null;
  destinoAwb: string | null;
  destinoFinal: string | null;
  creacion: string | null;
  /** Fecha de creación parseada de la columna "Creación" (ej. "22-05-2026 12:29"). */
  creacionFecha: string | null;
  /** Usuario que creó la coordinación (ej. "EXPERTS"). */
  creacionUser: string | null;
  /** id accionable del registro de coordinación EBF (extraído del botón update/delete). */
  detalleId: string | null;
  raw: Record<string, string>;
}

export interface CoordinacionListPage {
  items: CoordinacionListItem[];
  page: number;
  hasNextPage: boolean;
  sort?: string;
  retrievedAt: string;
}

export interface CoordinacionListQuery {
  page?: number;
  sort?:
    | 'etd'
    | 'awb'
    | 'exportador'
    | 'consignatario_marcacion'
    | 'producto'
    | 'dae'
    | 'hawb'
    | 'origen'
    | 'destino_awb'
    | 'destino_final'
    | 'created_at';
  includeHistorico?: boolean;
}

export interface CoordinacionDetalle {
  id: string;
  raw: Record<string, unknown>;
}
