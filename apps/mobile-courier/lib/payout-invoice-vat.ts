/** Ödeme talebi / kurye faturası için KDV oranı (talep tutarı KDV hariç). */
export const PAYOUT_INVOICE_VAT_RATE = 0.2;

export function parsePayoutAmount(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Kuryenin faturada yazması gereken KDV dahil toplam. */
export function payoutInvoiceGrossFromNet(netAmount: number): number {
  return Math.round(netAmount * (1 + PAYOUT_INVOICE_VAT_RATE) * 100) / 100;
}

export function formatPayoutMoney(amount: number): string {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
