import type { CustomerAwbDocument } from '../types/customer-awb.types';

const TR_RX = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
const TD_RX = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
const DOWNLOAD_HREF_RX =
  /href=["'](\/media\/[^"']+)["']/i;
const FILETYPE_RX = /bi-filetype-(\w+)/i;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Tab DOCUMENTS — `/customer/awb/<id>/documents/`. Si vacío devuelve mensaje
 * de "No documents...". Si tiene, tabla con #, File, icon, Download (anchor
 * a `/media/docs_coordinacion/<file>`).
 *
 * El parser recibe `downloadUrlBuilder` para construir la URL de proxy en
 * nuestra API (el archivo en EBF está detrás de la cookie de sesión — el
 * front no puede descargarlo directo).
 */
export function parseCustomerAwbDocuments(
  html: string,
  downloadUrlBuilder: (portalUrl: string) => string,
): CustomerAwbDocument[] {
  const out: CustomerAwbDocument[] = [];
  TR_RX.lastIndex = 0;
  let row: RegExpExecArray | null;
  while ((row = TR_RX.exec(html)) !== null) {
    const rowAttrs = row[1] ?? '';
    if (!/\bclass=["'][^"']*\b(even|odd)\b/.test(rowAttrs)) continue;
    const tdsRaw: string[] = [];
    TD_RX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TD_RX.exec(row[2])) !== null) tdsRaw.push(m[1]);
    if (tdsRaw.length < 4) continue;

    const indexText = stripHtml(tdsRaw[0]);
    const fileName = stripHtml(tdsRaw[1]);
    const iconHtml = tdsRaw[2];
    const downloadHtml = tdsRaw[3];

    const hrefMatch = DOWNLOAD_HREF_RX.exec(downloadHtml);
    const portalUrl = hrefMatch ? hrefMatch[1] : '';
    const typeMatch = FILETYPE_RX.exec(iconHtml);
    const fileType = typeMatch
      ? typeMatch[1].toLowerCase()
      : fileName.includes('.')
        ? fileName.split('.').pop()!.toLowerCase()
        : null;

    if (!fileName || !portalUrl) continue;
    out.push({
      index: parseInt(indexText, 10) || out.length + 1,
      fileName,
      fileType,
      portalUrl,
      downloadUrl: downloadUrlBuilder(portalUrl),
    });
  }
  return out;
}
