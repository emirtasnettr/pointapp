import type { LucideIcon } from 'lucide-react-native';
import { FileText, Package } from 'lucide-react-native';

/** API `DeliveryType` ile aynı */
export type CustomerDeliveryServiceType = 'DOCUMENT' | 'PACKAGE';

export type DeliveryServiceCard = {
  type: CustomerDeliveryServiceType;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Üst şerit + ikon rozeti için gradyan */
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

export function deliveryTypeShortLabel(type: string): string {
  switch (type) {
    case 'DOCUMENT':
      return 'Evrak';
    case 'PACKAGE':
      return 'Paket';
    default:
      return type;
  }
}
