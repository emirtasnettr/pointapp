'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const tabs = [
  { href: '/settings/system', label: 'Sistem' },
  { href: '/settings/users', label: 'Kullanıcılar' },
  { href: '/settings/marketing-campaigns', label: 'Kampanyalar' },
  { href: '/settings/marketing-services', label: 'Hizmetler' },
  { href: '/settings/roles', label: 'Roller' },
  { href: '/settings/sms', label: 'SMS' },
  { href: '/settings/payment', label: 'Ödeme' },
  { href: '/settings/logo', label: 'Logo' },
  { href: '/settings/legal', label: 'Müşteri yasal' },
  { href: '/settings/legal-courier', label: 'Kurye yasal' },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const path = pathname ?? '';
  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
      {tabs.map((t) => {
        const active = path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition',
              active
                ? 'border-brand/50 bg-brand/15 text-brand'
                : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
