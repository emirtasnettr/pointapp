'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeft, RefreshCw } from 'lucide-react';
import { adminNav, sectionLabel, type AdminNavChild, type AdminNavItem } from '@/lib/nav-admin';
import { clearStaffSession, getStaffUser, type StaffSessionUser } from '@/lib/admin-session';
import { staffRoleLabel } from '@/lib/staff-role';
import { AdminBrandMark } from '@/components/admin/AdminBrandMark';
import { cn } from '@/lib/cn';

function displayStaffName(u: StaffSessionUser | null) {
  if (!u) return 'Personel';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return name || u.email || 'Personel';
}

function navItemActive(path: string, href: string, children?: AdminNavChild[]) {
  if (path === href || path.startsWith(`${href}/`)) return true;
  return children?.some((c) => path === c.href || path.startsWith(`${c.href}/`)) ?? false;
}

function NavLink({ item, onNavigate, sidebarOpen }: { item: AdminNavItem; onNavigate?: () => void; sidebarOpen: boolean }) {
  const pathname = usePathname();
  const path = pathname ?? '';
  const active = navItemActive(path, item.href, item.children);
  const Icon = item.icon;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  if (item.children?.length) {
    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            if (sidebarOpen) {
              setExpanded((v) => !v);
              return;
            }
            onNavigate?.();
          }}
          aria-expanded={sidebarOpen ? expanded : undefined}
          aria-controls={sidebarOpen ? `nav-group-${item.href}` : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
            active ? 'text-brand' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
          )}
        >
          <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand' : 'text-zinc-500')} />
          {sidebarOpen ? (
            <>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200',
                  expanded && 'rotate-180',
                  active && 'text-brand',
                )}
                aria-hidden
              />
            </>
          ) : null}
        </button>
        {sidebarOpen && expanded ? (
          <div
            id={`nav-group-${item.href}`}
            className="ml-3 space-y-0.5 border-l border-zinc-200 pl-3"
          >
            {item.children.map((child) => {
              const childActive = path === child.href || path.startsWith(`${child.href}/`);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-lg px-2.5 py-2 text-xs font-medium transition',
                    childActive
                      ? 'bg-brand/15 text-brand'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        active
          ? 'bg-brand/15 text-brand shadow-[inset_0_0_0_1px_rgba(22,178,75,0.35)]'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand' : 'text-zinc-500 group-hover:text-zinc-700')} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();
  const [staff, setStaff] = useState<StaffSessionUser | null>(null);

  useEffect(() => {
    setStaff(getStaffUser());
  }, []);

  const sections = Array.from(new Set(adminNav.map((i) => i.section)));

  function signOut() {
    clearStaffSession();
    setStaff(null);
    router.replace('/auth/login');
  }

  async function refreshPage() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' });
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-zinc-100 text-zinc-900">
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
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-zinc-200/90 bg-white/90 shadow-soft backdrop-blur-2xl transition-transform duration-300 md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          !open && 'md:w-[76px]',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-zinc-200/90 px-4">
          <AdminBrandMark sidebarCollapsed={!open} onNavigate={() => setMobileOpen(false)} />
          <button
            type="button"
            className="hidden rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 md:inline-flex"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Daralt' : 'Genişlet'}
          >
            {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section} className="mb-6">
              {open ? (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  {sectionLabel[section]}
                </p>
              ) : (
                <div className="mx-2 mb-2 h-px bg-zinc-200" />
              )}
              <div className="space-y-0.5">
                {adminNav
                  .filter((i) => i.section === section)
                  .filter((i) => !i.systemAdminOnly || staff?.appRole === 'SYSTEM_ADMIN')
                  .map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      sidebarOpen={open}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200/90 p-4">
          <div className={cn('rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-3', !open && 'hidden')}>
            <p className="text-xs font-medium text-zinc-900">{displayStaffName(staff)}</p>
            {staff?.email ? <p className="mt-0.5 truncate text-[11px] text-zinc-500">{staff.email}</p> : null}
            {staff ? (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-brand">{staffRoleLabel(staff.appRole)}</p>
            ) : null}
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-700 transition hover:border-red-200 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200/90 bg-white/85 px-4 shadow-sm backdrop-blur-xl md:px-8">
          <button
            type="button"
            className="inline-flex rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menü"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-zinc-500">Şu an</p>
            <p className="truncate text-sm font-medium text-zinc-900">{pathname ?? ''}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void refreshPage()}
              disabled={refreshing}
              title="Sayfayı yenile"
              aria-label="Sayfayı yenile"
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition',
                'hover:border-brand/30 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin text-brand')} aria-hidden />
            </button>
            <div className="hidden h-9 w-px bg-zinc-200 sm:block" aria-hidden />
            <div className="hidden flex-col items-end text-right sm:flex">
              <span className="max-w-[220px] truncate text-xs font-medium text-zinc-900">
                {displayStaffName(staff)}
              </span>
              {staff ? (
                <span className="max-w-[220px] truncate text-[10px] text-zinc-500">
                  {staffRoleLabel(staff.appRole)}
                </span>
              ) : null}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
