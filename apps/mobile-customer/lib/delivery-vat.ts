/** Müşteri teslimat ücreti KDV oranı (hariç tutar üzerinden). */
export const DELIVERY_VAT_RATE = 0.2;

export type DeliveryVatPricing = {
  serviceAmount: string;
  vatAmount: string;
  totalPrice: string;
};

export function parseMoney(raw: string): number {
  const x = parseFloat(raw.replace(',', '.').trim());
  return Number.isFinite(x) ? x : 0;
}

export function formatMoneyAmount(amount: number): string {
  return amount.toFixed(2);
}

/** API yanıtından veya yalnızca hizmet tutarından KDV dahil fiyat özeti. */
export function resolveDeliveryVatPricing(row: {
  totalPrice: string;
  serviceAmount?: string;
  vatAmount?: string;
}): DeliveryVatPricing {
  if (row.serviceAmount != null && row.vatAmount != null) {
    return {
      serviceAmount: row.serviceAmount,
      vatAmount: row.vatAmount,
      totalPrice: row.totalPrice,
    };
  }
  const service = parseMoney(row.totalPrice);
  const vat = Math.round(service * DELIVERY_VAT_RATE * 100) / 100;
  const total = Math.round((service + vat) * 100) / 100;
  return {
    serviceAmount: formatMoneyAmount(service),
    vatAmount: formatMoneyAmount(vat),
    totalPrice: formatMoneyAmount(total),
  };
}
