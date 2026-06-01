import { apiBase } from '@/lib/api';

/** API’den gelen logo URL’sindeki host/port’u güncel `NEXT_PUBLIC_API_URL` ile hizalar. */
export function resolvePublicMediaUrl(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  const pathIdx = s.indexOf('/v1/files/local/');
  if (pathIdx < 0) return s;
  const origin = apiBase().replace(/\/v1\/?$/, '');
  return `${origin}${s.slice(pathIdx)}`;
}
