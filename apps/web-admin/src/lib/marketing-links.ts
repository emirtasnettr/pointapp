import { safeInternalPath } from './safe-internal-path';

/** Müşteri web uygulaması (panel — teslimat yönetimi). */
export function customerWebBase(): string {
  const raw = process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:7201';
}

export function customerWebPath(path: string): string {
  const base = customerWebBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Tanıtım sitesinde müşteri girişi (6790 ile aynı origin). */
export function customerLoginPath(next?: string | null): string {
  const safe = safeInternalPath(next ?? null, '/panel');
  return `/musteri/giris?next=${encodeURIComponent(safe)}`;
}

export function customerRegisterPath(next?: string | null): string {
  const safe = safeInternalPath(next ?? null, '/panel');
  return `/musteri/kayit?next=${encodeURIComponent(safe)}`;
}

/** Tanıtım sitesinde kurye kaydı */
export function courierRegisterPath(): string {
  return '/surucu/kayit';
}

/**
 * Giriş/kayıt 6790’da yapılır; panel token’ı 6791 localStorage’a hash ile aktarılır.
 */
export function customerPanelHandoffUrl(accessToken: string, next?: string | null): string {
  const params = new URLSearchParams();
  params.set('next', safeInternalPath(next ?? null, '/panel'));
  const qs = params.toString();
  const hash = `access_token=${encodeURIComponent(accessToken)}`;
  return `${customerWebPath('/auth/handoff')}?${qs}#${hash}`;
}
