'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { setCustomerAccessToken } from '@/lib/customer-session';
import { customerLoginUrl } from '@/lib/customer-login-url';
import { safeInternalPath } from '@/lib/safe-internal-path';

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  return 'http://localhost:5001/v1';
}

function handoffCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('code');
}

function nextFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('next');
}

export function CustomerHandoffClient() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const code = handoffCodeFromUrl();
    if (!code) {
      setErr('Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${apiBase()}/auth/customer/handoff/redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) {
          if (!cancelled) setErr('Oturum kodu geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
          return;
        }
        const data = (await res.json()) as { accessToken: string };
        if (cancelled) return;
        setCustomerAccessToken(data.accessToken);
        const path = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', path.split('?')[0] || '/auth/handoff');
        router.replace(safeInternalPath(nextFromUrl()));
      } catch {
        if (!cancelled) setErr('Bağlantı hatası. Lütfen tekrar giriş yapın.');
      }
    })();

    return () => {
      cancelled = true;
    };
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
      <p className="text-sm">Panele yönlendiriliyorsunuz…</p>
    </main>
  );
}
