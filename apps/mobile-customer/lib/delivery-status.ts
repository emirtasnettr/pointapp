export const deliveryStatusTr: Record<string, string> = {
  PENDING: 'Beklemede',
  POOL: 'Uygun Kurye Aranıyor',
  COURIER_ASSIGNED: 'Kurye atandı',
  COURIER_EN_ROUTE: 'Yolda',
  PACKAGE_PICKED_UP: 'Paket alındı',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
};

export function deliveryStatusLabel(status: string): string {
  return deliveryStatusTr[status] ?? status;
}

/** Rozet arka planı (açık tema) */
export function deliveryStatusTone(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'DELIVERED':
      return { bg: '#dcfce7', fg: '#166534' };
    case 'CANCELLED':
      return { bg: '#fee2e2', fg: '#b91c1c' };
    case 'POOL':
    case 'PENDING':
      return { bg: '#fef3c7', fg: '#b45309' };
    case 'COURIER_ASSIGNED':
    case 'COURIER_EN_ROUTE':
    case 'PACKAGE_PICKED_UP':
      return { bg: 'rgba(22, 178, 75, 0.14)', fg: '#15803d' };
    default:
      return { bg: '#f1f5f9', fg: '#475569' };
  }
}
