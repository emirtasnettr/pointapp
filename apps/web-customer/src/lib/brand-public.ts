import { resolvePublicMediaUrl } from '@/lib/resolve-public-media-url';

export type PublicBrand = {
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
};

function fetchAbortSignal(ms: number): AbortSignal | undefined {
  const AS = AbortSignal as typeof AbortSignal & { timeout?: (delay: number) => AbortSignal };
  if (typeof AS.timeout === 'function') return AS.timeout(ms);
  if (typeof window !== 'undefined') {
    const c = new AbortController();
    window.setTimeout(() => c.abort(), ms);
    return c.signal;
  }
  return undefined;
}

export async function fetchPublicBrand(): Promise<PublicBrand> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/v1';
  const isServer = typeof window === 'undefined';
  try {
    const res = await fetch(`${base}/public/brand`, {
      ...(isServer ? { next: { revalidate: 120 } } : { cache: 'no-store' }),
      signal: fetchAbortSignal(12_000),
    });
    if (!res.ok) {
      return { logoLightUrl: null, logoDarkUrl: null };
    }
    const data = (await res.json()) as PublicBrand;
    return {
      logoLightUrl: resolvePublicMediaUrl(data.logoLightUrl),
      logoDarkUrl: resolvePublicMediaUrl(data.logoDarkUrl),
    };
  } catch {
    return { logoLightUrl: null, logoDarkUrl: null };
  }
}
