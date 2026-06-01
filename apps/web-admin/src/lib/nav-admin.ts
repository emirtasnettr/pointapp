import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  CircleCheck,
  Bike,
  Users,
  Wallet,
  Banknote,
  Bell,
  MapPinned,
  Megaphone,
  BarChart3,
  ScrollText,
  SlidersHorizontal,
  Shield,
  UserCog,
  MessageSquare,
  CreditCard,
  ImageIcon,
} from 'lucide-react';

export type AdminNavChild = {
  href: string;
  label: string;
};

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: 'operasyon' | 'finans' | 'rapor' | 'sistem';
  /** Alt menü — örn. Kurye başvuru / belge ayarları */
  children?: AdminNavChild[];
  /** Yalnızca SYSTEM_ADMIN görür (sol menü) */
  systemAdminOnly?: boolean;
};

export const adminNav: AdminNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'operasyon' },
  { href: '/orders', label: 'Operasyon Yönetimi', icon: Package, section: 'operasyon' },
  { href: '/completed-deliveries', label: 'Tamamlanan Teslimatlar', icon: CircleCheck, section: 'operasyon' },
  {
    href: '/kurye/basvurular',
    label: 'Kurye',
    icon: Bike,
    section: 'operasyon',
    children: [
      { href: '/kurye/basvurular', label: 'Başvurular' },
      { href: '/kurye/belge-ayarlari', label: 'Belge ayarları' },
      { href: '/couriers', label: 'Kurye listesi' },
    ],
  },
  { href: '/customers', label: 'Müşteri Yönetimi', icon: Users, section: 'operasyon' },
  { href: '/notifications', label: 'Bildirim Yönetimi', icon: Bell, section: 'operasyon' },
  { href: '/regions', label: 'Bölge / Fiyat Matriksi', icon: MapPinned, section: 'operasyon' },
  { href: '/campaigns', label: 'Kampanyalar', icon: Megaphone, section: 'operasyon' },
  { href: '/finance', label: 'Finans Yönetimi', icon: Wallet, section: 'finans' },
  { href: '/payouts', label: 'Hakediş Yönetimi', icon: Banknote, section: 'finans' },
  { href: '/reports', label: 'Raporlama', icon: BarChart3, section: 'rapor' },
  { href: '/audit-logs', label: 'Denetim kayıtları', icon: ScrollText, section: 'rapor' },
  { href: '/settings/system', label: 'Sistem Ayarları', icon: SlidersHorizontal, section: 'sistem' },
  { href: '/settings/users', label: 'Kullanıcı yönetimi', icon: UserCog, section: 'sistem', systemAdminOnly: true },
  { href: '/settings/roles', label: 'Rol Yetkileri', icon: Shield, section: 'sistem' },
  { href: '/settings/sms', label: 'SMS Ayarları', icon: MessageSquare, section: 'sistem' },
  { href: '/settings/payment', label: 'Ödeme Ayarları', icon: CreditCard, section: 'sistem' },
  { href: '/settings/logo', label: 'Logo Yönetimi', icon: ImageIcon, section: 'sistem' },
];

export const sectionLabel: Record<AdminNavItem['section'], string> = {
  operasyon: 'Operasyon',
  finans: 'Finans',
  rapor: 'Rapor & Denetim',
  sistem: 'Sistem',
};
