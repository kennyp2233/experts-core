import type {
  AwbState,
  CustomerAwbListItem,
  CustomerAwbListPage,
  CustomerAwbListTotals,
} from '../types/customer-awb.types';

const TR_RX = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
const TD_RX = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
const TFOOT_RX = /<tfoot\b[^>]*>([\s\S]*?)<\/tfoot>/i;
const PAGE_RX = /hx-get=["']\?page=(\d+)["']/g;
const AWB_LINK_RX = /href=["']\/customer\/awb\/(\d+)\/info\/["'][^>]*>([\s\S]*?)<\/a>/i;

const MONTHS_EN: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTds(rowHtml: string): string[] {
  const out: string[] = [];
  TD_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TD_RX.exec(rowHtml)) !== null) out.push(m[1]);
  return out;
}

function parseDateEn(s: string | null): string | null {
  if (!s) return null;
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const mm = MONTHS_EN[m[2]];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`;
}

function parseNum(s: string | null | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseState(rowHtml: string, label: string): AwbState {
  if (/bi-airplane-fill[^"']*text-primary/.test(rowHtml)) return 'DEPARTED';
  if (/bi-circle[^"']*text-secondary/.test(rowHtml)) return 'IN_PROGRESS';
  if (/departed/i.test(label)) return 'DEPARTED';
  if (/in progress|en curso/i.test(label)) return 'IN_PROGRESS';
  return 'UNKNOWN';
}

function parseTotals(tfootHtml: string): CustomerAwbListTotals {
  const tds = extractTds(tfootHtml).map(stripHtml);
  // Layout: 7 blanks, BXS-COO, PCS-COO, BXS-WH, PCS-WH, Gross, Charge, blank state
  return {
    bxsCoo: parseNum(tds[7]),
    pcsCoo: parseNum(tds[8]),
    bxsWh: parseNum(tds[9]),
    pcsWh: parseNum(tds[10]),
    grossWeight: parseNum(tds[11]),
    chargeWeight: parseNum(tds[12]),
  };
}

/**
 * Parsea la tabla SSR de `/customer/awb/list/`. 14 columnas (en orden):
 * Consignee, ETD, ETA, Airline, D. AWB, D. Final, AWB(linked),
 * BXS-COO, PCS-COO, BXS-WH, PCS-WH, Gross Weight, Charge Weight, State.
 */
export function parseCustomerAwbList(
  html: string,
  currentPageHint = 1,
): Omit<CustomerAwbListPage, 'retrievedAt' | 'sort'> {
  const items: CustomerAwbListItem[] = [];

  TR_RX.lastIndex = 0;
  let row: RegExpExecArray | null;
  while ((row = TR_RX.exec(html)) !== null) {
    const rowAttrs = row[1] ?? '';
    const rowHtml = row[2];
    // Only data rows (class "even" / "odd")
    if (!/\bclass=["'][^"']*\b(even|odd)\b/.test(rowAttrs)) continue;
    const tds = extractTds(rowHtml).map((t) => ({ html: t, text: stripHtml(t) }));
    if (tds.length < 14) continue;

    const linkMatch = AWB_LINK_RX.exec(tds[6].html);
    if (!linkMatch) continue;
    const id = parseInt(linkMatch[1], 10);
    const awbNumber = stripHtml(linkMatch[2]);

    items.push({
      id,
      awbNumber,
      consignee: tds[0].text || null,
      etd: parseDateEn(tds[1].text),
      eta: parseDateEn(tds[2].text),
      airline: tds[3].text || null,
      destinoAwb: tds[4].text || null,
      destinoFinal: tds[5].text || null,
      bxsCoo: parseNum(tds[7].text),
      pcsCoo: parseNum(tds[8].text),
      bxsWh: parseNum(tds[9].text),
      pcsWh: parseNum(tds[10].text),
      grossWeight: parseNum(tds[11].text),
      chargeWeight: parseNum(tds[12].text),
      state: parseState(tds[13].html, tds[13].text),
      stateLabel: tds[13].text,
    });
  }

  const tfootMatch = TFOOT_RX.exec(html);
  const totals = tfootMatch
    ? parseTotals(tfootMatch[1])
    : { bxsCoo: 0, pcsCoo: 0, bxsWh: 0, pcsWh: 0, grossWeight: 0, chargeWeight: 0 };

  const pageNums = new Set<number>();
  PAGE_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAGE_RX.exec(html)) !== null) pageNums.add(parseInt(m[1], 10));
  const maxPage = pageNums.size ? Math.max(...pageNums) : currentPageHint;

  return {
    items,
    totals,
    page: currentPageHint,
    hasNextPage: maxPage > currentPageHint,
  };
}
