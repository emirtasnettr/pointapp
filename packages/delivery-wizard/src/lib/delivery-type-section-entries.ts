import type { DeliveryServiceCard } from './delivery-service-types';
import { DELIVERY_SERVICE_CARDS } from './delivery-service-types';
import type { SoonDeliveryService } from './soon-delivery-services';
import { SOON_DELIVERY_SERVICES } from './soon-delivery-services';

export type DeliveryTypeSectionEntry =
  | { kind: 'selectable'; data: DeliveryServiceCard }
  | { kind: 'soon'; data: SoonDeliveryService };

export function getDeliveryTypeSectionEntries(): DeliveryTypeSectionEntry[] {
  return [
    ...DELIVERY_SERVICE_CARDS.map((data) => ({ kind: 'selectable' as const, data })),
    ...SOON_DELIVERY_SERVICES.map((data) => ({ kind: 'soon' as const, data })),
  ];
}
