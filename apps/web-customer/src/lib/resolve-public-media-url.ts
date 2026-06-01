const defaultApiBase = 'http://localhost:5001/v1';

function apiOrigin(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? defaultApiBase;
  return base.replace(/\/v1\/?$/, '');
}

/** API’den gelen logo URL’sindeki host/port’u güncel `NEXT_PUBLIC_API_URL` ile hizalar. */
export function resolvePublicMediaUrl(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  const pathIdx = s.indexOf('/v1/files/local/');
  if (pathIdx < 0) return s;
  return `${apiOrigin()}${s.slice(pathIdx)}`;
}
