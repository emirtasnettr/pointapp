import { marketingWebPath } from '@/lib/marketing-web';
import { safeInternalPath } from '@/lib/safe-internal-path';

/** Panel koruması: giriş tanıtım sitesinde (6790), `next` panel yolunu taşır. */
export function customerLoginUrl(next?: string | null): string {
  const safe = safeInternalPath(next ?? null, '/panel');
  return `${marketingWebPath('/musteri/giris')}?next=${encodeURIComponent(safe)}`;
}

export function customerRegisterUrl(next?: string | null): string {
  const safe = safeInternalPath(next ?? null, '/panel');
  return `${marketingWebPath('/musteri/kayit')}?next=${encodeURIComponent(safe)}`;
}
