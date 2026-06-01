export type AddressSnapshot = {
  label?: string | null;
  line1?: string | null;
  city?: string | null;
};

const GENERIC_LABELS = new Set(['alış', 'teslim', 'pickup', 'dropoff', 'drop', '']);

export function placeFromAddressSnapshot(addr: AddressSnapshot | undefined | null): string {
  if (!addr) return '—';
  const line1 = (addr.line1 ?? '').trim();
  const label = (addr.label ?? '').trim();

  if (line1.includes(',')) {
    const first = line1.split(',')[0]?.trim();
    if (first) return first;
  }

  const lw = label.toLowerCase();
  if (label && !GENERIC_LABELS.has(lw)) return label;

  if (line1) {
    if (line1.length <= 32) return line1;
    return `${line1.slice(0, 30)}…`;
  }

  return (addr.city ?? '').trim() || '—';
}

export function deliveryRouteSummary(
  pickup?: AddressSnapshot | null,
  dropoff?: AddressSnapshot | null,
): string {
  return `${placeFromAddressSnapshot(pickup)} → ${placeFromAddressSnapshot(dropoff)}`;
}
