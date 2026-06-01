import { apiBase, apiTimeoutSignal } from './api';
import { parseApiError } from './parse-api-error';

/** Kimlik doğrulama gerektirmeyen müşteri / tanıtım API çağrıları. */
export async function publicApiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    cache: 'no-store',
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}

export async function publicApiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<T>;
}
