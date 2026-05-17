const FORM_TOKEN_RX =
  /<input[^>]*name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']+)["']/i;

/**
 * Extrae el valor de <input name="csrfmiddlewaretoken" value="..."> del HTML
 * de cualquier página del portal Django. Retorna null si no aparece.
 */
export function extractCsrfFormToken(html: string): string | null {
  const match = FORM_TOKEN_RX.exec(html);
  return match ? match[1] : null;
}
