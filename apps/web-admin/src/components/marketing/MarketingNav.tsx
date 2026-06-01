'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, LogIn, X, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { courierRegisterPath, customerLoginPath } from '@/lib/marketing-links';

const NAV = [
  { href: '/gonderi-takibi', label: 'Gönderi Takibi' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/hizmetler', label: 'Hizmetler' },
  { href: courierRegisterPath(), label: 'Sürücü Ol' },
] as const;

/** Header yükseklik ve içerik ölçekleri (%15 büyütme ile uyumlu). */
const S = 1.15;

type Props = {
  logoUrl: string | null;
};

function HamburgerButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  const width = `${1.25 * S}rem`;

  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-xl border transition md:hidden',
        open
          ? 'border-brand/30 bg-brand/10 text-brand'
          : 'border-zinc-200/90 bg-white text-zinc-700 shadow-sm hover:border-brand/25 hover:bg-zinc-50',
      )}
      style={{ width: `${2.75 * S}rem`, height: `${2.75 * S}rem` }}
      aria-expanded={open}
      aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
      onClick={onClick}
    >
      <span className="sr-only">{open ? 'Menüyü kapat' : 'Menüyü aç'}</span>
      <span className="relative block h-[0.875rem]" style={{ width }} aria-hidden>
        <span
          className={cn(
            'absolute left-0 top-0 block h-0.5 w-full rounded-full bg-current transition duration-300 ease-out',
            open && 'top-1/2 -translate-y-1/2 rotate-45',
          )}
        />
        <span
          className={cn(
            'absolute left-0 top-1/2 block h-0.5 w-full -translate-y-1/2 rounded-full bg-current transition duration-300 ease-out',
            open ? 'scale-x-0 opacity-0' : 'opacity-100',
          )}
        />
        <span
          className={cn(
            'absolute bottom-0 left-0 block h-0.5 w-full rounded-full bg-current transition duration-300 ease-out',
            open && 'bottom-1/2 translate-y-1/2 -rotate-45',
          )}
        />
      </span>
    </button>
  );
}

export function MarketingNav({ logoUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b border-zinc-200/80 bg-white transition duration-300',
          scrolled && 'shadow-sm',
        )}
      >
        <div
          className="mx-auto flex max-w-6xl items-center justify-between gap-[calc(1rem*1.15)] px-4 sm:px-6"
          style={{ height: `${4 * S}rem` }}
        >
          <Link href="/" className="flex min-w-0 items-center" style={{ gap: `${0.5 * S}rem` }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- API marka URL
              <img
                src={logoUrl}
                alt="Point"
                className="w-auto object-contain object-left"
                style={{ height: `${2 * S}rem`, maxWidth: `${140 * S}px` }}
              />
            ) : (
              <span
                className="font-bold tracking-tight text-brand"
                style={{ fontSize: `${1.125 * S}rem` }}
              >
                Point
              </span>
            )}
          </Link>

          <nav
            className="hidden items-center md:flex"
            style={{ gap: `${2 * S}rem` }}
            aria-label="Ana menü"
          >
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-medium text-zinc-600 transition hover:text-zinc-900"
                style={{ fontSize: `${0.875 * S}rem` }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center md:flex" style={{ gap: `${0.5 * S}rem` }}>
            <Link
              href="/gonderi"
              className="inline-flex items-center gap-1.5 rounded-full font-medium text-zinc-700 transition hover:bg-zinc-100"
              style={{
                fontSize: `${0.875 * S}rem`,
                padding: `${0.5 * S}rem ${1 * S}rem`,
              }}
            >
              <Zap className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              Gönderi Oluştur
            </Link>
            <Link
              href={customerLoginPath()}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand font-semibold text-white shadow-soft transition hover:opacity-90"
              style={{
                fontSize: `${0.875 * S}rem`,
                padding: `${0.5 * S}rem ${1 * S}rem`,
              }}
            >
              <LogIn className="h-4 w-4 shrink-0" aria-hidden />
              Giriş/Kayıt Ol
            </Link>
          </div>

          <HamburgerButton open={open} onClick={() => setOpen((v) => !v)} />
        </div>
      </header>

      {/* Mobil drawer — soldan sağa */}
      <div
        className={cn(
          'fixed inset-0 z-[60] md:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-zinc-900/45 backdrop-blur-sm transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Menüyü kapat"
          tabIndex={open ? 0 : -1}
          onClick={close}
        />

        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(88vw,20rem)] flex-col border-r border-zinc-200/90 bg-white/95 shadow-[4px_0_32px_-8px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Mobil menü"
        >
          <div className="relative overflow-hidden border-b border-zinc-200/80 px-5 py-4">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/12 via-brand/5 to-transparent"
              aria-hidden
            />
            <div className="relative flex items-center justify-between gap-3">
              <Link href="/" className="min-w-0" onClick={close}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Point" className="h-8 w-auto max-w-[120px] object-contain object-left" />
                ) : (
                  <span className="text-lg font-bold tracking-tight text-brand">Point</span>
                )}
              </Link>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
                aria-label="Menüyü kapat"
                onClick={close}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobil menü">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="group flex items-center justify-between rounded-xl px-3 py-3.5 text-[0.9375rem] font-medium text-zinc-800 transition hover:bg-brand/[0.07] hover:text-zinc-900"
                    onClick={close}
                  >
                    <span>{item.label}</span>
                    <ChevronRight
                      className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-brand"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-2 border-t border-zinc-200/80 bg-zinc-50/80 p-4">
            <Link
              href="/gonderi"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-brand/30 hover:bg-brand/[0.04]"
              onClick={close}
            >
              <Zap className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              Gönderi Oluştur
            </Link>
            <Link
              href={customerLoginPath()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
              onClick={close}
            >
              <LogIn className="h-4 w-4 shrink-0" aria-hidden />
              Giriş/Kayıt Ol
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
