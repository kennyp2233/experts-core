export type AwbState = 'IN_PROGRESS' | 'DEPARTED' | 'UNKNOWN';

/** Fila de la tabla `/customer/awb/list/`. */
export interface CustomerAwbListItem {
  id: number;
  awbNumber: string;
  consignee: string | null;
  /** ISO YYYY-MM-DD (normalizado desde "26-May-2026"). */
  etd: string | null;
  eta: string | null;
  airline: string | null;
  destinoAwb: string | null;
  destinoFinal: string | null;
  bxsCoo: number;
  pcsCoo: number;
  bxsWh: number;
  pcsWh: number;
  grossWeight: number;
  chargeWeight: number;
  state: AwbState;
  stateLabel: string;
}

export interface CustomerAwbListTotals {
  bxsCoo: number;
  pcsCoo: number;
  bxsWh: number;
  pcsWh: number;
  grossWeight: number;
  chargeWeight: number;
}

export interface CustomerAwbListPage {
  items: CustomerAwbListItem[];
  totals: CustomerAwbListTotals;
  page: number;
  hasNextPage: boolean;
  sort?: string;
  retrievedAt: string;
}

/** Filtros del list (acepta los mismos params que el form HTMX del portal). */
export interface CustomerAwbListQuery {
  /** YYYY-MM-DD — requerido por el portal. */
  etdStart: string;
  etdEnd: string;
  aerolinea?: string;
  /** ID del consignee (consignatarios en el portal). */
  consignatarios?: number;
  awb?: string;
  page?: number;
  sort?: string;
}

/** Header card del detalle AWB (parte estática del `/info/`). */
export interface CustomerAwbHeader {
  id: number;
  awbNumber: string;
  airline: string | null;
  etd: string | null;
  eta: string | null;
  consignee: string | null;
  shipper: string | null;
  route: string | null;
  availableTabs: Array<'INFO' | 'CUSTOMERS' | 'DOCUMENTS'>;
  documentCount: number;
}

/** Tab CUSTOMERS — resumen por consignee. */
export interface CustomerAwbCustomerRow {
  index: number;
  consignee: string | null;
  truck: string | null;
  bxsCoo: number;
  pcsCoo: number;
  bxsWh: number;
  pcsWh: number;
}

export interface CustomerAwbCustomersView {
  rows: CustomerAwbCustomerRow[];
}

/** Tab DOCUMENTS — lista de archivos publicados para el AWB. */
export interface CustomerAwbDocument {
  index: number;
  fileName: string;
  /** "pdf", "xlsx", etc. — derivado del ícono / extensión. */
  fileType: string | null;
  /** URL relativa al portal (`/media/docs_coordinacion/<file>`). NO descargable
   * directo desde el front (requiere cookie). El back expone un proxy. */
  portalUrl: string;
  /** URL del proxy en NUESTRA API para que el front pueda descargar. */
  downloadUrl: string;
}

export interface CustomerAwbDocumentsView {
  awbId: number;
  documents: CustomerAwbDocument[];
  downloadAllUrl: string;
  hasDocuments: boolean;
}

/** Opciones de los filtros del tab INFO. */
export interface InfoFilterOption {
  value: string;
  label: string;
}

/**
 * Tab INFO — vista per-consignee con métricas COO/WH. La estructura por
 * consignee es compleja (cards anidadas con sub-tablas por shipper/producto),
 * por eso devolvemos los filtros parseados + `rawHtml` del contenido para
 * que el front lo renderice o se itere parseo después.
 */
export interface CustomerAwbDetailsView {
  awbId: number;
  filters: {
    customers: InfoFilterOption[];
    trucks: InfoFilterOption[];
    shippers: InfoFilterOption[];
    onlyDailyCoo: boolean;
  };
  /** URL del proxy del XLSX (`?_export=xlsx` upstream). */
  exportXlsxUrl: string;
  /** HTML del contenedor de tablas — render directo en el front por ahora. */
  rawTablesHtml: string;
}

/** Perfil cliente — info básica + URL para cambio de password. */
export interface CustomerProfile {
  clienteId: number;
  displayName: string;
  email: string | null;
  changePasswordUrl: string;
}
