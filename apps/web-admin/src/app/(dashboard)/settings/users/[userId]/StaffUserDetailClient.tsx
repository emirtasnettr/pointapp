'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { SettingsTabs } from '@/components/admin/SettingsTabs';
import { apiGet, apiPatch } from '@/lib/api';
import { getStaffUser } from '@/lib/admin-session';
import { staffAssignableRoleOptions, type StaffAssignableRole } from '@/lib/staff-assignable-roles';
import { staffRoleLabel } from '@/lib/staff-role';
import { cn } from '@/lib/cn';

type Detail = {
  userId: string;
  email: string | null;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  appRole: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

const STATUS_TR: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
};

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40';

const btnSecondary =
  'rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-brand/30 disabled:opacity-50';

export function StaffUserDetailClient({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const me = getStaffUser();
  const isAdmin = me?.appRole === 'SYSTEM_ADMIN';

  const meQuery = useQuery({
    queryKey: ['staff', 'me'],
    queryFn: () => apiGet<{ userId: string }>('/staff/me'),
    enabled: isAdmin,
    staleTime: 120_000,
  });

  const query = useQuery({
    queryKey: ['staff', 'users', userId],
    queryFn: () => apiGet<Detail>(`/staff/users/${encodeURIComponent(userId)}`),
    enabled: isAdmin,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [appRole, setAppRole] = useState<StaffAssignableRole>('OPERATIONS_SPECIALIST');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');

  const c = query.data;

  useEffect(() => {
    if (!c) return;
    setFirstName(c.firstName ?? '');
    setLastName(c.lastName ?? '');
    setPhone(c.phone);
    setAppRole(c.appRole as StaffAssignableRole);
  }, [c]);

  const profileM = useMutation({
    mutationFn: () =>
      apiPatch<Detail>(`/staff/users/${encodeURIComponent(userId)}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.replace(/\s|-/g, '').trim(),
        appRole,
      }),
    onSuccess: (data) => {
      qc.setQueryData(['staff', 'users', userId], data);
      void qc.invalidateQueries({ queryKey: ['staff', 'users'] });
    },
  });

  const statusM = useMutation({
    mutationFn: (status: 'ACTIVE' | 'PASSIVE') =>
      apiPatch<Detail>(`/staff/users/${encodeURIComponent(userId)}/status`, { status }),
    onSuccess: (data) => {
      qc.setQueryData(['staff', 'users', userId], data);
      void qc.invalidateQueries({ queryKey: ['staff', 'users'] });
    },
  });

  const passwordM = useMutation({
    mutationFn: (password: string) =>
      apiPatch<Detail>(`/staff/users/${encodeURIComponent(userId)}/password`, { password }),
    onSuccess: (data) => {
      qc.setQueryData(['staff', 'users', userId], data);
      setPwdNew('');
      setPwdConfirm('');
    },
  });

  if (!isAdmin) {
    return (
      <>
        <SettingsTabs />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Yalnızca sistem yöneticisi personel detayını yönetebilir.
        </p>
      </>
    );
  }

  if (query.isPending) {
    return (
      <>
        <SettingsTabs />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </>
    );
  }

  if (query.isError || !c) {
    return (
      <>
        <SettingsTabs />
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(query.error as Error)?.message ?? 'Personel bulunamadı'}
        </p>
        <Link href="/settings/users" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          ← Listeye dön
        </Link>
      </>
    );
  }

  const self = meQuery.data?.userId === userId;
  const roleOptions = staffAssignableRoleOptions();

  return (
    <>
      <SettingsTabs />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/settings/users"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kullanıcı listesi
        </Link>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', query.isFetching && 'animate-spin')} />
          Yenile
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h1 className="text-lg font-semibold text-zinc-900">
            {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {staffRoleLabel(c.appRole)}
            <span className="mx-1.5 text-zinc-300">·</span>
            <span className="font-medium">{STATUS_TR[c.status] ?? c.status}</span>
            {self ? <span className="ml-2 text-xs text-brand">(siz)</span> : null}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{c.email}</p>

          {!self && (c.status === 'ACTIVE' || c.status === 'PASSIVE') ? (
            <div className="mt-3">
              <button
                type="button"
                disabled={statusM.isPending}
                className={btnSecondary}
                onClick={() => {
                  if (c.status === 'PASSIVE') {
                    statusM.mutate('ACTIVE');
                    return;
                  }
                  if (
                    typeof window !== 'undefined' &&
                    !window.confirm('Personel pasife alınsın mı? Panele giriş yapamaz.')
                  ) {
                    return;
                  }
                  statusM.mutate('PASSIVE');
                }}
              >
                {c.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}
              </button>
              {statusM.isError ? (
                <p className="mt-1 text-xs text-red-700">{(statusM.error as Error).message}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 border-b border-zinc-100 px-5 py-5 lg:grid-cols-2">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Profil</h2>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                profileM.mutate();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-zinc-600">
                  Ad
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                    disabled={self}
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Soyad
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                    disabled={self}
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-zinc-600">
                Telefon
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  disabled={self}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Rol
                <select
                  value={appRole}
                  onChange={(e) => setAppRole(e.target.value as StaffAssignableRole)}
                  className={inputClass}
                  disabled={self}
                >
                  {roleOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {!self ? (
                <button
                  type="submit"
                  disabled={profileM.isPending}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
                >
                  {profileM.isPending ? 'Kaydediliyor…' : 'Profili kaydet'}
                </button>
              ) : (
                <p className="text-xs text-zinc-500">Kendi profilinizi buradan düzenleyemezsiniz.</p>
              )}
              {profileM.isError ? (
                <p className="text-xs text-red-700">{(profileM.error as Error).message}</p>
              ) : null}
              {profileM.isSuccess ? <p className="text-xs text-emerald-700">Kaydedildi.</p> : null}
            </form>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Şifre</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Yeni şifre kaydedildiğinde personelin mevcut oturumları sonlandırılır (kendi şifreniz hariç).
            </p>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (pwdNew.length < 8) return;
                if (pwdNew !== pwdConfirm) return;
                passwordM.mutate(pwdNew);
              }}
            >
              <label className="block text-xs font-medium text-zinc-600">
                Yeni şifre
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={pwdNew}
                  onChange={(e) => {
                    setPwdNew(e.target.value);
                    passwordM.reset();
                  }}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Tekrar
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwdConfirm}
                  onChange={(e) => {
                    setPwdConfirm(e.target.value);
                    passwordM.reset();
                  }}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                disabled={passwordM.isPending || pwdNew.length < 8 || pwdNew !== pwdConfirm}
                className={btnSecondary}
              >
                Şifreyi güncelle
              </button>
              {pwdNew && pwdConfirm && pwdNew !== pwdConfirm ? (
                <p className="text-xs text-amber-800">Şifreler eşleşmiyor.</p>
              ) : null}
              {passwordM.isError ? (
                <p className="text-xs text-red-700">{(passwordM.error as Error).message}</p>
              ) : null}
              {passwordM.isSuccess ? <p className="text-xs text-emerald-700">Şifre güncellendi.</p> : null}
            </form>
          </section>
        </div>

        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-3 text-xs text-zinc-500">
            Son giriş:{' '}
            {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString('tr-TR') : 'Henüz giriş yok'}
          </div>
          <div className="px-5 py-3 text-xs text-zinc-500">
            Hesap oluşturma: {new Date(c.createdAt).toLocaleString('tr-TR')}
          </div>
        </div>
      </div>
    </>
  );
}
