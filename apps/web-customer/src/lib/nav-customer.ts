import type { LucideIcon } from 'lucide-react';
import { FileText, LayoutGrid, Megaphone, PlusCircle, ListOrdered, MapPin, UserRound } from 'lucide-react';

export type CustomerNavItem = { href: string; label: string; icon: LucideIcon };

export const customerNav: CustomerNavItem[] = [
  { href: '/panel', label: 'Özet', icon: LayoutGrid },
  { href: '/delivery/new', label: 'Teslimat', icon: PlusCircle },
  { href: '/orders', label: 'Siparişler', icon: ListOrdered },
  { href: '/invoices', label: 'Faturalarım', icon: FileText },
  { href: '/addresses', label: 'Adresler', icon: MapPin },
  { href: '/campaigns', label: 'Kampanyalar', icon: Megaphone },
  { href: '/account', label: 'Hesabım', icon: UserRound },
];
