/** Havuz / aktif liste kartları için kısa adres satırı */
export function deliveryRouteLine(addr: unknown): string {
  if (!addr || typeof addr !== 'object' || Array.isArray(addr)) return '—';
  const o = addr as Record<string, unknown>;
  const line1 = typeof o.line1 === 'string' ? o.line1.trim() : '';
  const city = typeof o.city === 'string' ? o.city.trim() : '';
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  if (line1 && city) return `${line1}, ${city}`;
  if (line1) return line1;
  if (label && city) return `${label}, ${city}`;
  if (label) return label;
  return city || '—';
}

/** Paket gönderilerinde kurye listeleri için kg metni (örn. "2,5 kg"). */
export function formatPackageWeightKg(weightKg: string | null | undefined): string | null {
  if (weightKg == null || weightKg === '') return null;
  const n = Number.parseFloat(String(weightKg).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kg`;
}

/** Kurye hakedişi KDV hariç hizmet bedeli üzerinden hesaplanır ve gösterilir. */
export const COURIER_EARNING_VAT_NOTE = 'KDV hariç';

export function formatDeliveryEarning(value: string | undefined): string {
  if (!value) return '—';
  const n = Number.parseFloat(value);
  if (Number.isFinite(n)) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return value;
}
