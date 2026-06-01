'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { setCustomerAccessToken } from '@/lib/customer-session';
import { customerLoginUrl } from '@/lib/customer-login-url';
import { safeInternalPath } from '@/lib/safe-internal-path';

function nextFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('next');
}

function readAccessTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) return null;
  return new URLSearchParams(raw).get('access_token');
}

export function CustomerHandoffClient() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = readAccessTokenFromHash();
    if (!token) {
      setErr('Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    setCustomerAccessToken(token);
    const path = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', path);
    router.replace(safeInternalPath(nextFromUrl()));
  }, [router]);

  if (err) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
        <p className="max-w-md text-center text-sm text-red-700">{err}</p>
        <a href={customerLoginUrl()} className="text-sm font-semibold text-brand hover:underline">
          Giriş sayfasına dön
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-zinc-600">
      <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
      <p className="text-sm font-medium">Panele yönlendiriliyorsunuz…</p>
    </main>
  );
}
