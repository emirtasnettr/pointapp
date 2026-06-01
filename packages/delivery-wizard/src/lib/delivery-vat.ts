export type DeliveryVatPricing = {
  serviceAmount: string;
  vatAmount: string;
  totalPrice: string;
};

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
  return {
    serviceAmount: row.totalPrice,
    vatAmount: '0.00',
    totalPrice: row.totalPrice,
  };
}
