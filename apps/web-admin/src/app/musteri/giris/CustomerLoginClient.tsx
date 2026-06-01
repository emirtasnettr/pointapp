'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lock, Mail, Package, Shield, Zap } from 'lucide-react';
import {
  AuthBrandPanel,
  AuthErrorAlert,
  AuthField,
  AuthGlassCard,
  AuthInputWrap,
  AuthPageHero,
  AuthPrimaryButton,
  authFieldClass,
} from '@/components/customer/auth-ui';
import { apiBase } from '@/lib/api';
import { customerPanelHandoffUrl } from '@/lib/marketing-links';
import { parseApiError } from '@/lib/parse-api-error';

type LoginResponse = {
  accessToken: string;
};

function nextFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('next');
}

export function CustomerLoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [registerHref, setRegisterHref] = useState('/musteri/kayit');

  useEffect(() => {
    const q = window.location.search;
    setRegisterHref(q ? `/musteri/kayit${q}` : '/musteri/kayit');
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const res = await fetch(`${apiBase()}/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        setErr(await parseApiError(res));
        return;
      }
      const data = (await res.json()) as LoginResponse;
      window.location.assign(customerPanelHandoffUrl(data.accessToken, nextFromUrl()));
    } catch {
      setErr('Bağlantı hatası');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="lg:hidden">
        <AuthPageHero
          badge="Müşteri paneli"
          title="Giriş yap"
          description="Siparişlerinizi takip edin, teslimat oluşturun ve adreslerinizi yönetin."
          icon={Shield}
        />
      </div>

      <AuthGlassCard padding="none" className="overflow-hidden">
        <div className="grid lg:grid-cols-5 lg:items-stretch">
          <div className="hidden lg:col-span-2 lg:flex lg:self-stretch">
            <AuthBrandPanel className="w-full flex-1 rounded-l-3xl">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
                  <Zap className="h-3.5 w-3.5" aria-hidden />
                  Point
                </p>
                <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight">
                  Anlık ve Planlı Teslimatlarınız İçin En Hızlı Çözüm
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  Canlı takip, kayıtlı adresler ve şeffaf fiyatlandırma — hepsi müşteri panelinizde.
                </p>
              </div>
              <ul className="mt-10 space-y-3 text-sm text-white/90">
                <li className="flex items-center gap-2">
                  <Package className="h-4 w-4 shrink-0 text-emerald-100" aria-hidden />
                  Anlık gönderi oluşturma
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-emerald-100" aria-hidden />
                  Güvenli ödeme geçmişi
                </li>
              </ul>
            </AuthBrandPanel>
          </div>

          <div className="lg:col-span-3">
            <div className="p-6 sm:p-8">
              <div className="hidden lg:block">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Giriş yap</h2>
              </div>

              <form className="mt-6 space-y-4 lg:mt-8" onSubmit={onSubmit}>
                <AuthField label="E-posta" htmlFor="email">
                  <AuthInputWrap icon={Mail}>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={authFieldClass}
                      placeholder="ornek@firma.com"
                      required
                    />
                  </AuthInputWrap>
                </AuthField>

                <AuthField label="Şifre" htmlFor="password">
                  <AuthInputWrap icon={Lock}>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={authFieldClass}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </AuthInputWrap>
                </AuthField>

                {err ? <AuthErrorAlert message={err} /> : null}

                <div className="space-y-3 pt-1">
                  <AuthPrimaryButton type="submit" disabled={pending}>
                    {pending ? 'Giriş yapılıyor…' : 'Giriş yap'}
                  </AuthPrimaryButton>
                  <Link
                    href={registerHref}
                    className="flex w-full items-center justify-center rounded-2xl border border-zinc-200/90 bg-white py-3.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-brand/35 hover:bg-zinc-50"
                  >
                    Kayıt ol
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </AuthGlassCard>
    </div>
  );
}
