import { getCustomerAccessToken, setCustomerAccessToken } from './customer-session';
import { customerLoginUrl } from './customer-login-url';
import { parseApiError } from './parse-api-error';

/** API yanıt vermezse sayfanın süresiz “yükleniyor”da kalmasını engeller. */
const API_FETCH_TIMEOUT_MS = 15_000;

function apiTimeoutSignal(): AbortSignal {
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

function authHeaders(): HeadersInit {
  const token = getCustomerAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function redirectToLoginOnUnauthorized() {
  if (typeof window === 'undefined') return;
  setCustomerAccessToken(null);
  const next = window.location.pathname + window.location.search;
  window.location.replace(customerLoginUrl(next.startsWith('/auth') ? '/panel' : next || '/panel'));
}

export async function apiGetAuth<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    cache: 'no-store',
    headers: authHeaders(),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      redirectToLoginOnUnauthorized();
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}

/** Müşteri sipariş faturasını JWT ile yeni sekmede açar. */
export async function openCustomerDeliveryInvoice(invoiceId: string): Promise<void> {
  const res = await fetch(
    `${apiBase()}/customer/deliveries/customer-invoices/${encodeURIComponent(invoiceId)}/file`,
    {
      cache: 'no-store',
      headers: authHeaders(),
      signal: apiTimeoutSignal(),
    },
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export async function apiPostAuth<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      redirectToLoginOnUnauthorized();
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}

export async function apiPatchAuth<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      redirectToLoginOnUnauthorized();
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}

export async function apiDeleteAuth(path: string): Promise<void> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      redirectToLoginOnUnauthorized();
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
    throw new Error(await parseApiError(res));
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { cache: 'no-store', signal: apiTimeoutSignal() });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    const { parseApiError } = await import('./parse-api-error');
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}
