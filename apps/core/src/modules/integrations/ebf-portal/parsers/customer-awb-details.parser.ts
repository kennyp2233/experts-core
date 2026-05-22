import type {
  CustomerAwbDetailsView,
  InfoFilterOption,
} from '../types/customer-awb.types';

const SELECT_RX = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
const OPTION_RX = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
const ATTR_RX = /(\w[\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
const TABLES_CONTAINER_RX =
  /<div\b[^>]*\bid=["']tables-container["'][^>]*>([\s\S]*)<\/div>\s*(?=<\/div>|$)/i;

function parseAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RX.exec(tag)) !== null) {
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    out[m[1].toLowerCase()] = val;
  }
  return out;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseOptions(body: string): InfoFilterOption[] {
  const out: InfoFilterOption[] = [];
  OPTION_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = OPTION_RX.exec(body)) !== null) {
    const attrs = parseAttrs(m[1]);
    const value = attrs.value ?? '';
    if (!value) continue;
    out.push({ value, label: stripTags(m[2]) });
  }
  return out;
}

function findSelectBody(html: string, name: string): string | null {
  SELECT_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SELECT_RX.exec(html)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (attrs.name === name) return m[2];
  }
  return null;
}

/**
 * Tab INFO — `/customer/awb/<id>/details/`. Estructura:
 *   - `#id-awb-top-filter-container` (OOB swap): filtros Customer, Truck,
 *     Shipper, Only Daily COO.
 *   - `#tables-container`: botón Export XLSX + 1-N cards por consignee con
 *     sub-tablas de métricas (BXS/PCS/FB/HB/QB/EB para COO y WH).
 *
 * Devolvemos filtros parseados + URLs propias (XLSX proxy) + HTML crudo del
 * contenedor de tablas. La estructura per-consignee es lo suficientemente
 * portal-specific como para no parsearla server-side por ahora — el front
 * puede renderizarla directo (todos los `hx-*` quedan inertes sin htmx).
 */
export function parseCustomerAwbDetails(
  awbId: number,
  html: string,
  exportXlsxUrl: string,
): CustomerAwbDetailsView {
  const customers = parseOptions(
    findSelectBody(html, 'consignatario_marcacion') ?? '',
  );
  const trucks = parseOptions(findSelectBody(html, 'truck') ?? '');
  const shippers = parseOptions(findSelectBody(html, 'shipper') ?? '');

  // only_daily_coo viene como select Yes/No con value="True"/"False"
  const onlyDailySelect = findSelectBody(html, 'only_daily_coo');
  let onlyDailyCoo = false;
  if (onlyDailySelect) {
    const selectedMatch =
      /<option\b[^>]*value=["']([^"']+)["'][^>]*\bselected\b/i.exec(
        onlyDailySelect,
      );
    onlyDailyCoo = selectedMatch ? selectedMatch[1] === 'True' : false;
  }

  const tablesMatch = TABLES_CONTAINER_RX.exec(html);
  const rawTablesHtml = tablesMatch ? tablesMatch[1] : '';

  return {
    awbId,
    filters: { customers, trucks, shippers, onlyDailyCoo },
    exportXlsxUrl,
    rawTablesHtml,
  };
}
