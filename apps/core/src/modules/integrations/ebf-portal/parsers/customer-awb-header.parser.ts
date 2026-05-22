import type { CustomerAwbHeader } from '../types/customer-awb.types';

const TITLE_H1_RX = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
const FIELD_RX = (label: string) =>
  new RegExp(
    `<span[^>]*>\\s*${label}:\\s*<\\/span>\\s*<span[^>]*class=["'][^"']*fw-semibold[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,
    'i',
  );
const TAB_RX = (id: string) =>
  new RegExp(
    `<input[^>]*id=["']${id}["'][^>]*>`,
    'i',
  );
const DOCS_BADGE_RX =
  /DOCUMENTS\s*<span[^>]*class=["'][^"']*badge[^"']*["'][^>]*>\s*(\d+)\s*<\/span>/i;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function field(html: string, label: string): string | null {
  const m = FIELD_RX(label).exec(html);
  if (!m) return null;
  const v = stripHtml(m[1]);
  return v || null;
}

/**
 * Header card del detalle AWB. Layout:
 *   <h1>{awbNumber}</h1>
 *   <span>AWB:</span><span class="fw-semibold">157-4665 4532</span>
 *   <span>Airline:</span><span class="fw-semibold">QATAR AIRWAYS (QR)</span>
 *   <span>ETD/ETA:</span><span class="fw-semibold">26-May-2026 / 26-May-2026</span>
 *   <span>Consignee:</span><span class="fw-semibold">KAM</span>
 *   <span>Shipper:</span><span class="fw-semibold">EBF CARGO ...</span>
 *   <span>Route:</span><span class="fw-semibold">UIO / AMS</span>
 *
 * Y la barra de tabs con `<input type="radio" id="btnAwb{Info|Customers}">`.
 * El botón DOCUMENTS puede ser un `<input>` (habilitado) o `<span class="disabled">DOCUMENTS <span class="badge">N</span></span>` (con contador).
 */
export function parseCustomerAwbHeader(id: number, html: string): CustomerAwbHeader {
  const titleMatch = TITLE_H1_RX.exec(html);
  const awbNumberFromTitle = titleMatch ? stripHtml(titleMatch[1]) : '';
  const awbNumber = field(html, 'AWB') ?? awbNumberFromTitle;
  const etdEta = field(html, 'ETD\\/ETA');
  let etd: string | null = null;
  let eta: string | null = null;
  if (etdEta) {
    const parts = etdEta.split('/').map((s) => s.trim());
    etd = parts[0] || null;
    eta = parts[1] || null;
  }

  const availableTabs: CustomerAwbHeader['availableTabs'] = [];
  if (TAB_RX('btnAwbInfo').test(html)) availableTabs.push('INFO');
  if (TAB_RX('btnAwbCustomers').test(html)) availableTabs.push('CUSTOMERS');
  // DOCUMENTS: badge always present con N (0 = tab deshabilitado). Lo incluimos
  // siempre porque el endpoint responde aunque sea con "no documents".
  availableTabs.push('DOCUMENTS');

  const badgeMatch = DOCS_BADGE_RX.exec(html);
  const documentCount = badgeMatch ? parseInt(badgeMatch[1], 10) : 0;

  return {
    id,
    awbNumber,
    airline: field(html, 'Airline'),
    etd,
    eta,
    consignee: field(html, 'Consignee'),
    shipper: field(html, 'Shipper'),
    route: field(html, 'Route'),
    availableTabs,
    documentCount,
  };
}
