'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LogOut, Menu, PanelLeft, PanelLeftClose } from 'lucide-react';
import { CustomerBrandMark } from '@/components/customer/CustomerBrandMark';
import { customerNav } from '@/lib/nav-customer';
import { cn } from '@/lib/cn';
import { customerLoginUrl } from '@/lib/customer-login-url';
import { setCustomerAccessToken } from '@/lib/customer-session';

function navActive(path: string, href: string) {
  return path === href || (href !== '/panel' && path.startsWith(`${href}/`));
}

function pageTitle(path: string): string {
  const exact = customerNav.find((i) => i.href === path);
  if (exact) return exact.label;
  const nested = customerNav.find((i) => path.startsWith(`${i.href}/`));
  if (nested) return nested.label;
  if (path.startsWith('/orders/')) return 'Sipariş detayı';
  if (path.startsWith('/campaigns/')) return 'Kampanya';
  return 'Müşteri paneli';
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  sidebarOpen,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: (typeof customerNav)[0]['icon'];
  active: boolean;
  sidebarOpen: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={!sidebarOpen ? label : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        active
          ? 'bg-brand/15 text-brand shadow-[inset_0_0_0_1px_rgba(22,178,75,0.35)]'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50',
        !sidebarOpen && 'justify-center px-2',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          active ? 'text-brand' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300',
        )}
      />
      {sidebarOpen ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname ?? '';
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = useMemo(() => pageTitle(path), [path]);

  function signOut() {
    setCustomerAccessToken(null);
    window.location.assign(customerLoginUrl());
  }

  return (
    <div className="flex min-h-dvh bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-200/90 bg-white/90 shadow-soft backdrop-blur-2xl transition-[width,transform] duration-300 dark:border-white/10 dark:bg-zinc-950/95 md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          open ? 'w-[272px]' : 'w-[76px]',
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center gap-2 border-b border-zinc-200/90 px-3 dark:border-white/10',
            open || mobileOpen ? 'justify-between' : 'justify-center',
          )}
        >
          {open || mobileOpen ? (
            <CustomerBrandMark onNavigate={() => setMobileOpen(false)} />
          ) : null}
          <button
            type="button"
            className="hidden rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/10 md:inline-flex"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Menüyü daralt' : 'Menüyü genişlet'}
          >
            {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {open ? (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Menü</p>
          ) : (
            <div className="mx-2 mb-2 h-px bg-zinc-200 dark:bg-white/10" />
          )}
          {customerNav.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={navActive(path, item.href)}
              sidebarOpen={open}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200/90 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/85 md:px-6">
          <button
            type="button"
            className="inline-flex rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-900 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-zinc-500">Müşteri paneli</p>
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
          </div>
          <button
            type="button"
            title="Çıkış"
            onClick={signOut}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-red-500/40 dark:hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </header>

        <main className="flex-1 px-4 py-5 md:px-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
