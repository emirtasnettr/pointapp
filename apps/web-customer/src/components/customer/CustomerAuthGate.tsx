'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import { getCustomerAccessToken } from '@/lib/customer-session';
import { customerLoginUrl } from '@/lib/customer-login-url';

function loginUrl(pathname: string | null): string {
  let next = pathname && pathname !== '/' ? pathname : '/panel';
  if (next.startsWith('/auth')) next = '/panel';
  return customerLoginUrl(next);
}

/**
 * Sunucuda token yok → “checking”; istemcide layout effect ile allowed / denied.
 * `dynamic(..., ssr: false)` olmadan chunk / ENOENT riskini azaltır.
 */
export function CustomerAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useLayoutEffect(() => {
    const token = getCustomerAccessToken();
    if (!token) {
      setPhase('denied');
      window.location.replace(loginUrl(pathname));
      return;
    }
    let cancelled = false;
    void apiGetAuth<{ customerPublicId: string }>('/customer/me')
      .then(() => {
        if (!cancelled) setPhase('allowed');
      })
      .catch(() => {
        if (!cancelled) {
          setPhase('denied');
          window.location.replace(loginUrl(pathname));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (phase === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-zinc-50 to-white text-sm text-zinc-500 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-400">
        Oturum doğrulanıyor…
      </div>
    );
  }

  if (phase === 'denied') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-50 to-white px-6 text-center text-sm text-zinc-500 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-400">
        <p>Giriş sayfasına yönlendiriliyorsunuz…</p>
        <Link href={loginUrl(pathname)} className="text-xs font-medium text-brand hover:underline">
          Yönlendirilmiyorsa buraya tıklayın
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
