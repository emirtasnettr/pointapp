/**
 * API `pickupAddress` / `dropoffAddress` JSON anlık görüntüsü — bilinen alanları
 * kurye ekranında okunur tek metin halinde birleştirir.
 */
const TEXT_KEYS = [
  'label',
  'title',
  'line1',
  'line2',
  'district',
  'neighborhood',
  'city',
  'postalCode',
  'zip',
  'building',
  'floor',
  'doorNo',
  'apartment',
  'notes',
  'country',
  'countryCode',
] as const;

export function formatAddressSnapshot(raw: unknown): string {
  if (raw === null || raw === undefined) return '—';
  if (typeof raw !== 'object' || Array.isArray(raw)) return '—';
  const o = raw as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of TEXT_KEYS) {
    const v = o[key];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) parts.push(key === 'notes' ? `Not: ${t}` : t);
    }
  }
  return parts.length ? parts.join('\n') : '—';
}

export function addressLatLng(raw: unknown): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const lat = Number(o.lat ?? o.latitude);
  const lng = Number(o.lng ?? o.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Google Maps — cihazda uygulama / tarayıcı açılır. */
export function googleMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}
