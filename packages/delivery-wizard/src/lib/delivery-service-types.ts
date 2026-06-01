import type { LucideIcon } from 'lucide-react';
import { FileText, Package } from 'lucide-react';

export type CustomerDeliveryServiceType = 'DOCUMENT' | 'PACKAGE';

export type DeliveryServiceCard = {
  type: CustomerDeliveryServiceType;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  accentGradient: readonly [string, string];
};

export const DELIVERY_SERVICE_CARDS: DeliveryServiceCard[] = [
  {
    type: 'DOCUMENT',
    title: 'Evrak teslimatı',
    subtitle: 'Zarf, imza, günlük evrak',
    Icon: FileText,
    accentGradient: ['#4f46e5', '#818cf8'] as const,
  },
  {
    type: 'PACKAGE',
    title: 'Paket / koli teslimatı',
    subtitle: 'Kutu, koli, hafif yük',
    Icon: Package,
    accentGradient: ['#16B24B', '#0f7a32'] as const,
  },
];
