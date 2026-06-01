import { apiBase, apiTimeoutSignal } from '@/lib/api';

export type GeoDistrict = { id: string; name: string; regionId: string };
export type GeoNeighborhood = { id: string; name: string; districtId: string; extraFee: string };

export type PublicDeliveryQuote = {
  totalPrice: string;
  serviceAmount?: string;
  vatAmount?: string;
};

async function parseApiError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(j.message)) return j.message.join(' ');
    if (typeof j.message === 'string') return j.message;
  } catch {
    /* ham metin */
  }
  return raw || 'İşlem başarısız';
}

export async function fetchGeoDistricts(): Promise<GeoDistrict[]> {
  const res = await fetch(`${apiBase()}/geography/districts`, {
    cache: 'no-store',
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<GeoDistrict[]>;
}

export async function fetchDistrictQuote(body: {
  pickupDistrictId: string;
  dropoffDistrictId: string;
}): Promise<PublicDeliveryQuote> {
  const res = await fetch(`${apiBase()}/geography/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) {
    let msg = await res.text();
    try {
      const j = JSON.parse(msg) as { message?: string | string[] };
      if (Array.isArray(j.message)) msg = j.message.join(' ');
      else if (typeof j.message === 'string') msg = j.message;
    } catch {
      /* ham metin */
    }
    throw new Error(msg || 'Fiyat hesaplanamadı');
  }
  return res.json() as Promise<PublicDeliveryQuote>;
}

export async function fetchGeoNeighborhoods(districtId: string): Promise<GeoNeighborhood[]> {
  const res = await fetch(
    `${apiBase()}/geography/neighborhoods?districtId=${encodeURIComponent(districtId)}`,
    { cache: 'no-store', signal: apiTimeoutSignal() },
  );
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<GeoNeighborhood[]>;
}

export type DeliveryQuoteRequest = {
  pickupDistrictId: string;
  pickupNeighborhoodId: string;
  dropoffDistrictId: string;
  dropoffNeighborhoodId: string;
  type?: 'DOCUMENT' | 'PACKAGE';
  vehicleType?: 'MOTORCYCLE' | 'CAR';
  weightKg?: number;
};

export async function fetchFullDeliveryQuote(body: DeliveryQuoteRequest): Promise<PublicDeliveryQuote> {
  const res = await fetch(`${apiBase()}/geography/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<PublicDeliveryQuote>;
}

export async function createGuestDelivery(body: unknown): Promise<{ orderNumber: number }> {
  const res = await fetch(`${apiBase()}/public/deliveries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<{ orderNumber: number }>;
}
