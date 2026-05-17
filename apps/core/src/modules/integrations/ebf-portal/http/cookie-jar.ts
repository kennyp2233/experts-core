/**
 * Cookie jar minimal pensado para un único host (portal.ebfcargo.com).
 * Guardamos solo name → value; ignoramos Domain/Path/Expires porque siempre
 * hablamos con el mismo origen. Si en algún momento se necesita multi-host
 * o expiración estricta, cambiar a `tough-cookie`.
 */
export class CookieJar {
  private cookies = new Map<string, string>();

  ingestSetCookie(setCookieHeader: string | string[] | undefined): void {
    if (!setCookieHeader) return;
    const headers = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];
    for (const raw of headers) {
      const [pair] = raw.split(';');
      if (!pair) continue;
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  toHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  clear(): void {
    this.cookies.clear();
  }

  size(): number {
    return this.cookies.size;
  }
}
