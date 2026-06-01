export const deliveryStatusTr: Record<string, string> = {
  PENDING: 'Beklemede',
  POOL: 'Uygun Kurye Aranıyor',
  COURIER_ASSIGNED: 'Kurye atandı',
  COURIER_EN_ROUTE: 'Yolda',
  PACKAGE_PICKED_UP: 'Paket alındı',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
};

export function deliveryStatusLabel(status: string) {
  return deliveryStatusTr[status] ?? status;
}
