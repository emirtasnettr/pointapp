'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBase, apiTimeoutSignal } from '@/lib/api';
import { PUBLIC_BRAND_QUERY_KEY, fetchPublicBrand } from '@/lib/brand-public';
import { getStaffAccessToken, setStaffSession } from '@/lib/admin-session';
import { safeInternalPath } from '@/lib/safe-internal-path';

type LoginResponse = {
  accessToken: string;
  user: {
    email: string | null;
    firstName?: string | null;
    lastName?: string | null;
    appRole: string;
  };
};

function nextFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('next');
}

export function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const brandQ = useQuery({
    queryKey: PUBLIC_BRAND_QUERY_KEY,
    queryFn: fetchPublicBrand,
    staleTime: 120_000,
  });
  const loginLogo = brandQ.data?.logoLightUrl?.trim() || null;

  useEffect(() => {
    if (!getStaffAccessToken()) return;
    router.replace(safeInternalPath(nextFromUrl()));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const res = await fetch(`${apiBase()}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: apiTimeoutSignal(),
      });
      if (!res.ok) {
        setErr((await res.text()) || 'Giriş başarısız');
        return;
      }
      const data = (await res.json()) as LoginResponse;
      setStaffSession(data.accessToken, {
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        appRole: data.user.appRole,
      });
      router.replace(safeInternalPath(nextFromUrl()));
    } catch {
      setErr('Bağlantı hatası');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-zinc-100 p-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-8 shadow-soft">
        {loginLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- API’den dinamik URL
          <img src={loginLogo} alt="Point" className="h-11 w-auto max-w-[220px] object-contain object-left" />
        ) : (
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Point</p>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Yönetim girişi</h1>
        <p className="mt-2 text-sm text-zinc-600">Personel e-postası ve şifrenizle oturum açın.</p>
        <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Demo: <span className="font-mono">yonetici@pointdelivery.com.tr</span> /{' '}
          <span className="font-mono">12345678</span> — <code className="text-[11px]">npm run db:seed</code>
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="text-xs font-medium text-zinc-500">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-brand/25 focus:ring-2"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-medium text-zinc-500">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-brand/25 focus:ring-2"
              required
              minLength={6}
            />
          </div>
          {err ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Giriş…' : 'Giriş yap'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Point Yönetim — yetkili personel içindir.{' '}
          <Link href="/" className="font-medium text-zinc-700 hover:text-brand">
            Ana site
          </Link>
        </p>
      </div>
    </main>
  );
}
