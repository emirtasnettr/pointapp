import type { LucideIcon } from 'lucide-react';
import { Home, PawPrint, Route } from 'lucide-react';

export type SoonDeliveryService = {
  id: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  gradient: readonly [string, string];
};

export const SOON_DELIVERY_SERVICES: SoonDeliveryService[] = [
  {
    id: 'pet',
    title: 'Pet Taşımacılığı',
    subtitle: 'Evcil dostlarınız için güvenli ve konforlu taşıma.',
    Icon: PawPrint,
    gradient: ['#0ea5e9', '#0369a1'] as const,
  },
  {
    id: 'nakliyat',
    title: 'Evden Eve Nakliyat',
    subtitle: 'Eşyalarınız için planlı ve özenli nakliye.',
    Icon: Home,
    gradient: ['#a855f7', '#6d28d9'] as const,
  },
  {
    id: 'sehirlerarasi',
    title: 'Şehirler Arası Yük',
    subtitle: 'Uzun mesafe yük taşımacılığı, rota bazlı.',
    Icon: Route,
    gradient: ['#f97316', '#c2410c'] as const,
  },
];
