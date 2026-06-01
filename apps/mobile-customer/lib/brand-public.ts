import { apiGet, resolveMediaUrlForDevice } from './api';

export type PublicBrand = {
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
};

export async function fetchPublicBrand(): Promise<PublicBrand> {
  try {
    const b = await apiGet<PublicBrand>('/public/brand');
    return {
      logoLightUrl: resolveMediaUrlForDevice(b.logoLightUrl),
      logoDarkUrl: resolveMediaUrlForDevice(b.logoDarkUrl),
    };
  } catch {
    return { logoLightUrl: null, logoDarkUrl: null };
  }
}
