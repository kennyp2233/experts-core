import type {
  CustomerAwbCustomerRow,
  CustomerAwbCustomersView,
} from '../types/customer-awb.types';

const TR_RX = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
const TD_RX = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseNum(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Tab CUSTOMERS — `/customer/awb/<id>/customers/`. 7 columnas:
 * #, Consignee, Truck, BXS COO, PCS COO, BXS WH, PCS WH.
 */
export function parseCustomerAwbCustomers(html: string): CustomerAwbCustomersView {
  const rows: CustomerAwbCustomerRow[] = [];
  TR_RX.lastIndex = 0;
  let row: RegExpExecArray | null;
  while ((row = TR_RX.exec(html)) !== null) {
    const rowAttrs = row[1] ?? '';
    if (!/\bclass=["'][^"']*\b(even|odd)\b/.test(rowAttrs)) continue;
    const tdsRaw: string[] = [];
    TD_RX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TD_RX.exec(row[2])) !== null) tdsRaw.push(stripHtml(m[1]));
    if (tdsRaw.length < 7) continue;
    rows.push({
      index: parseInt(tdsRaw[0], 10) || rows.length + 1,
      consignee: tdsRaw[1] || null,
      truck: tdsRaw[2] || null,
      bxsCoo: parseNum(tdsRaw[3]),
      pcsCoo: parseNum(tdsRaw[4]),
      bxsWh: parseNum(tdsRaw[5]),
      pcsWh: parseNum(tdsRaw[6]),
    });
  }
  return { rows };
}
