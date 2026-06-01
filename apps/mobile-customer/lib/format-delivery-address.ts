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
