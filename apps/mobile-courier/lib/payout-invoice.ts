export const PAYOUT_INVOICE_MAX_BYTES = 40 * 1024 * 1024;

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']);

export function payoutInvoiceMimeFromName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return null;
}

export function normalizePayoutInvoiceMime(mime: string | null | undefined, name: string): string | null {
  const m = mime?.toLowerCase().trim();
  if (m && ALLOWED.has(m)) return m === 'image/jpg' ? 'image/jpeg' : m;
  const fromName = payoutInvoiceMimeFromName(name);
  return fromName;
}

export function payoutInvoiceLabel(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'image/png') return 'PNG';
  return 'Görsel';
}
