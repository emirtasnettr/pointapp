import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { emitLoginRequired } from './auth-events';
import { clearCustomerSession, getCustomerAccessToken } from './session';

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function isLoopbackHost(h: string): boolean {
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
}

/** URL’deki host localhost / 127.0.0.1 mi? */
function urlUsesLoopbackHost(urlStr: string): boolean {
  try {
    return isLoopbackHost(new URL(urlStr).hostname);
  } catch {
    return /localhost|127\.0\.0\.1/i.test(urlStr);
  }
}

function replaceUrlHostname(urlStr: string, hostname: string): string {
  const u = new URL(urlStr);
  u.hostname = hostname;
  return trimTrailingSlash(u.toString());
}

/**
 * Metro `hostUri` bilgisayarın LAN IP’si olduğunda (Expo Go gerçek cihaz),
 * `.env` içindeki `localhost` API adresini aynı host’a çevirir.
 * Tünel (exp.direct / ngrok): dokunmaz — API için ayrıca public URL gerekir.
 */
function shouldRewriteMetroHostToApi(host: string): boolean {
  const h = host.trim();
  if (!h || isLoopbackHost(h)) return false;
  if (/exp\.direct|ngrok|loca\.lt/i.test(h)) return false;
  if (h.endsWith('.local')) return true;
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/** `EXPO_PUBLIC_API_URL` içinde localhost ise geliştirmede cihaza uygun host’a çevirir. */
function resolveDevApiUrlFromEnv(raw: string): string {
  const url = trimTrailingSlash(raw);
  if (!__DEV__ || !urlUsesLoopbackHost(url)) return url;

  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0]?.trim() ?? '';
  if (metroHost && shouldRewriteMetroHostToApi(metroHost)) {
    return replaceUrlHostname(url, metroHost);
  }

  // Android emülatör: Metro host’u loopback görünür; API makineye 10.0.2.2 ile gider
  if (Platform.OS === 'android' && (!metroHost || isLoopbackHost(metroHost))) {
    return replaceUrlHostname(url, '10.0.2.2');
  }

  return url;
}

export function apiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return normalizeApiRoot(resolveDevApiUrlFromEnv(fromEnv));

  if (!__DEV__) {
    throw new Error(
      'EXPO_PUBLIC_API_URL tanımlı değil. Production build için API adresini .env veya EAS secrets ile verin.',
    );
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return normalizeApiRoot(`http://${host}:5001/v1`);
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/v1';
  }

  return 'http://localhost:5001/v1';
}

/**
 * Ayarlarda saklanan tam logo URL’si `localhost` / `127.0.0.1` ise cihazdan erişilebilir
 * API host’una çevirir (Expo Go gerçek cihaz / emülatör).
 */
export function resolveMediaUrlForDevice(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  if (!__DEV__ || !urlUsesLoopbackHost(s)) return s;
  try {
    const u = new URL(s);
    const api = new URL(apiBase());
    u.hostname = api.hostname;
    u.port = api.port;
    return trimTrailingSlash(u.toString());
  } catch {
    return s;
  }
}

/** `EXPO_PUBLIC_API_URL` kökü `/v1` ile bitmiyorsa geliştirmede tamamlar. */
function normalizeApiRoot(url: string): string {
  const u = trimTrailingSlash(url);
  if (u.endsWith('/v1')) return u;
  if (__DEV__ && /^https?:\/\/.+:\d+$/i.test(u)) return `${u}/v1`;
  return u;
}

/** Eşzamanlı girişte eski isteğin 401’i yeni oturumu silmesin. */
async function clearSessionOnUnauthorized(tokenUsed: string): Promise<void> {
  const current = await getCustomerAccessToken();
  if (current !== tokenUsed) return;
  await clearCustomerSession();
  emitLoginRequired();
}

async function readErrorMessage(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    if (j.message) return Array.isArray(j.message) ? j.message.join(', ') : j.message;
  } catch {
    /* ignore */
  }
  return raw || res.statusText;
}

export async function apiGet<T>(path: string): Promise<T> {
  const base = apiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`);
  } catch (e) {
    const hint =
      Platform.OS === 'android'
        ? 'Android: emülatörde API genelde http://10.0.2.2:5001/v1'
        : 'EXPO_PUBLIC_API_URL=http://<bilgisayar-ip>:5001/v1 ayarlayın.';
    throw new Error(`Ağ hatası (${base}): ${(e as Error).message}. ${hint}`);
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const base = apiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const hint =
      Platform.OS === 'android'
        ? 'Android emülatör: API http://10.0.2.2:5001/v1; gerçek cihaz: bilgisayar LAN IP’si.'
        : 'API çalışıyor mu? (npm run dev:api). Expo tünelinde EXPO_PUBLIC_API_URL ile erişilebilir URL verin.';
    throw new Error(`Ağ hatası (${base}): ${(e as Error).message}. ${hint}`);
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<T>;
}

export async function apiGetAuth<T>(path: string): Promise<T> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error('Oturum yok. Lütfen giriş yapın.');
  }
  const base = apiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    throw new Error(`Ağ hatası (${base}): ${(e as Error).message}`);
  }
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    if (res.status === 401) {
      await clearSessionOnUnauthorized(token);
      throw new Error(msg || 'Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function apiPostAuth<T>(path: string, body: unknown): Promise<T> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error('Oturum yok. Lütfen giriş yapın.');
  }
  const base = apiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Ağ hatası (${base}): ${(e as Error).message}`);
  }
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    if (res.status === 401) {
      await clearSessionOnUnauthorized(token);
      throw new Error(msg || 'Oturum süresi doldu.');
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function apiPatchAuth<T>(path: string, body: unknown): Promise<T> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error('Oturum yok. Lütfen giriş yapın.');
  }
  const base = apiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Ağ hatası (${base}): ${(e as Error).message}`);
  }
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    if (res.status === 401) {
      await clearSessionOnUnauthorized(token);
      throw new Error(msg || 'Oturum süresi doldu.');
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function apiDeleteAuth<T>(path: string): Promise<T> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error('Oturum yok. Lütfen giriş yapın.');
  }
  const base = apiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    throw new Error(`Ağ hatası (${base}): ${(e as Error).message}`);
  }
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    if (res.status === 401) {
      await clearSessionOnUnauthorized(token);
      throw new Error(msg || 'Oturum süresi doldu.');
    }
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
