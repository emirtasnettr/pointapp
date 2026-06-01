/** DB’deki tam logo URL’sini güncel API köküne göre yeniden yazar (port değişince kırılmayı önler). */
export function resolvePublicFileUrl(
  stored: string | null | undefined,
  apiOrigin: string,
): string | null {
  const s = stored?.trim();
  if (!s) return null;
  const origin = apiOrigin.replace(/\/$/, '');
  const pathIdx = s.indexOf('/v1/files/local/');
  if (pathIdx >= 0) {
    return `${origin}${s.slice(pathIdx)}`;
  }
  if (s.startsWith('/v1/files/local/')) {
    return `${origin}${s}`;
  }
  return s;
}

export function apiOriginFromConfig(
  publicApiOrigin: string | undefined,
  port: string | undefined,
): string {
  const fromEnv = publicApiOrigin?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const p = port?.trim() || '5001';
  return `http://localhost:${p}`;
}
