export type CourierDeliveryAction = 'claim' | 'start_route' | 'pickup' | 'complete';

const ACTION_LABELS: Record<CourierDeliveryAction, string> = {
  claim: 'Üstüme al',
  start_route: 'Yola çıktım',
  pickup: 'Paketi teslim aldım',
  complete: 'Teslim ettim',
};

/** Sıradaki tek bir kurye aksiyonu (durum + atanmış kurye kontrolü). */
export function getNextCourierAction(
  status: string,
  courierPublicId: string | null | undefined,
  myPublicId: string | null,
): { action: CourierDeliveryAction; label: string } | null {
  if (!myPublicId) return null;

  if (status === 'POOL') {
    if (!courierPublicId) {
      return { action: 'claim', label: ACTION_LABELS.claim };
    }
    return null;
  }

  if (courierPublicId !== myPublicId) {
    return null;
  }

  switch (status) {
    case 'COURIER_ASSIGNED':
      return { action: 'start_route', label: ACTION_LABELS.start_route };
    case 'COURIER_EN_ROUTE':
      return { action: 'pickup', label: ACTION_LABELS.pickup };
    case 'PACKAGE_PICKED_UP':
      return { action: 'complete', label: ACTION_LABELS.complete };
    default:
      return null;
  }
}

export function courierActionPath(action: CourierDeliveryAction, orderNumber: number): string {
  const ref = String(orderNumber);
  switch (action) {
    case 'claim':
      return `/courier/deliveries/${ref}/claim`;
    case 'start_route':
      return `/courier/deliveries/${ref}/start-route`;
    case 'pickup':
      return `/courier/deliveries/${ref}/pickup`;
    case 'complete':
      return `/courier/deliveries/${ref}/complete`;
  }
}

export const statusLabelsTr: Record<string, string> = {
  PENDING: 'Beklemede',
  POOL: 'Havuzda',
  COURIER_ASSIGNED: 'Atandı',
  COURIER_EN_ROUTE: 'Yolda',
  PACKAGE_PICKED_UP: 'Paket alındı',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
};
