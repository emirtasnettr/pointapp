import { apiBase, apiTimeoutSignal } from '@/lib/api';
import { resolvePublicMediaUrl } from '@/lib/resolve-public-media-url';

export type PublicBrandImage = {
  url: string | null;
  width: number | null;
  height: number | null;
};

export type PublicBrand = {
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  heroImage: PublicBrandImage;
  customerShowcase: PublicBrandImage;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
};

const EMPTY_IMAGE = { url: null, width: null, height: null } as const;

function mapImage(
  raw: PublicBrandImage | undefined,
): PublicBrandImage {
  return {
    url: resolvePublicMediaUrl(raw?.url ?? null),
    width: raw?.width ?? null,
    height: raw?.height ?? null,
  };
}

function emptyBrand(): PublicBrand {
  return {
    logoLightUrl: null,
    logoDarkUrl: null,
    heroImage: { ...EMPTY_IMAGE },
    customerShowcase: { ...EMPTY_IMAGE },
    appStoreUrl: null,
    googlePlayUrl: null,
  };
}

export const PUBLIC_BRAND_QUERY_KEY = ['public', 'brand'] as const;

export async function fetchPublicBrand(): Promise<PublicBrand> {
  try {
    const res = await fetch(`${apiBase()}/public/brand`, {
      cache: 'no-store',
      signal: apiTimeoutSignal(),
    });
    if (!res.ok) {
      return emptyBrand();
    }
    const data = (await res.json()) as PublicBrand;
    return {
      logoLightUrl: resolvePublicMediaUrl(data.logoLightUrl),
      logoDarkUrl: resolvePublicMediaUrl(data.logoDarkUrl),
      heroImage: mapImage(data.heroImage),
      customerShowcase: mapImage(data.customerShowcase),
      appStoreUrl: data.appStoreUrl?.trim() || null,
      googlePlayUrl: data.googlePlayUrl?.trim() || null,
    };
  } catch {
    return emptyBrand();
  }
}
