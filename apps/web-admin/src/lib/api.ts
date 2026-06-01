import { clearStaffSession, getStaffAccessToken } from './admin-session';
import { safeInternalPath } from './safe-internal-path';

/** API yanıt vermezse sayfanın süresiz “yükleniyor”da kalmasını engeller. */
export const API_FETCH_TIMEOUT_MS = 15_000;

export function apiTimeoutSignal(): AbortSignal {
  const ms = API_FETCH_TIMEOUT_MS;
  const AS = AbortSignal as typeof AbortSignal & { timeout?: (delay: number) => AbortSignal };
  if (typeof AS.timeout === 'function') {
    return AS.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/v1';
}

export function staffAuthHeaders(): HeadersInit {
  const token = getStaffAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Staff korumalı uçlarda 401: token yok / süresi dolmuş / geçersiz.
 * Oturumu temizleyip girişe yönlendirir (auth sayfasında tekrar yönlendirme yapmaz).
 */
export function redirectToStaffLoginIfUnauthorized(res: Response): boolean {
  if (res.status !== 401 || typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/auth')) return false;
  clearStaffSession();
  const raw = window.location.pathname + window.location.search;
  const safe = safeInternalPath(raw);
  const next = encodeURIComponent(safe === '/' ? '/dashboard' : safe);
  window.location.assign(`/auth/login?next=${next}`);
  return true;
}

function formatStaffApiErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(j.message)) return j.message.join(' · ');
    if (typeof j.message === 'string') return j.message;
  } catch {
    /* ham metin */
  }
  return text;
}

/** Staff istemcisi: `fetch` sonrası 401 → giriş; aksi halde gövde metni ile hata. */
export async function staffParseJsonRes<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  if (redirectToStaffLoginIfUnauthorized(res)) {
    throw new Error('Oturum gerekli — giriş sayfasına yönlendiriliyorsunuz.');
  }
  throw new Error(formatStaffApiErrorBody(await res.text()));
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { ...staffAuthHeaders() } as Record<string, string>;
  let payload: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers,
    body: payload,
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<T>(res);
}

/** Müşteri sipariş faturasını staff JWT ile yeni sekmede açar. */
export async function openStaffDeliveryCustomerInvoice(invoiceId: string): Promise<void> {
  const res = await fetch(
    `${apiBase()}/deliveries/customer-invoices/${encodeURIComponent(invoiceId)}/file`,
    {
      cache: 'no-store',
      headers: staffAuthHeaders(),
      signal: apiTimeoutSignal(),
    },
  );
  if (!res.ok) {
    if (redirectToStaffLoginIfUnauthorized(res)) {
      throw new Error('Oturum gerekli — giriş sayfasına yönlendiriliyorsunuz.');
    }
    throw new Error(await res.text());
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/** Ödeme talebi faturasını staff JWT ile yeni sekmede açar. */
export async function openStaffPayoutInvoice(payoutId: string): Promise<void> {
  const res = await fetch(
    `${apiBase()}/staff/payout-requests/${encodeURIComponent(payoutId)}/invoice`,
    {
      cache: 'no-store',
      headers: staffAuthHeaders(),
      signal: apiTimeoutSignal(),
    },
  );
  if (!res.ok) {
    if (redirectToStaffLoginIfUnauthorized(res)) {
      throw new Error('Oturum gerekli — giriş sayfasına yönlendiriliyorsunuz.');
    }
    throw new Error(await res.text());
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { ...staffAuthHeaders() } as Record<string, string>;
  let payload: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers,
    body: payload,
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'DELETE',
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<T>(res);
}

/** multipart (FormData); Content-Type ayarlanmaz (boundary için tarayıcı ekler). */
export async function staffPostMultipart<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: staffAuthHeaders(),
    body: formData,
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<T>(res);
}
