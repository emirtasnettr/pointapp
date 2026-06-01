'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';
import { getStaffAccessToken } from '@/lib/admin-session';
import { safeInternalPath } from '@/lib/safe-internal-path';

function staffLoginHref(pathname: string | null): string {
  let next = pathname && pathname !== '/' ? pathname : '/dashboard';
  if (next.startsWith('/auth')) next = '/dashboard';
  return `/auth/login?next=${encodeURIComponent(safeInternalPath(next))}`;
}

/**
 * Sunucuda `getStaffAccessToken()` yok → her zaman “checking”; istemcide layout effect ile
 * allowed / denied. `dynamic(..., ssr: false)` kullanmadan chunk / ENOENT riskini azaltır.
 */
export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useLayoutEffect(() => {
    if (getStaffAccessToken()) {
      setPhase('allowed');
      return;
    }
    setPhase('denied');
    window.location.replace(staffLoginHref(pathname));
  }, [pathname]);

  if (phase === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Oturum doğrulanıyor…
      </div>
    );
  }

  if (phase === 'denied') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-100 px-6 text-center text-sm text-zinc-600">
        <p>Giriş sayfasına yönlendiriliyorsunuz…</p>
        <Link href={staffLoginHref(pathname)} className="text-xs font-medium text-brand hover:underline">
          Yönlendirilmiyorsa buraya tıklayın
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
