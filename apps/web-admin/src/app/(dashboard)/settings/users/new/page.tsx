'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { SettingsTabs } from '@/components/admin/SettingsTabs';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiPost } from '@/lib/api';
import { getStaffUser } from '@/lib/admin-session';
import { staffAssignableRoleOptions } from '@/lib/staff-assignable-roles';
import { cn } from '@/lib/cn';

type CreateResponse = { userId: string };

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40';

export default function NewStaffUserPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = getStaffUser();
  const isAdmin = me?.appRole === 'SYSTEM_ADMIN';

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [appRole, setAppRole] = useState('OPERATIONS_SPECIALIST');

  const createM = useMutation({
    mutationFn: () =>
      apiPost<CreateResponse>('/staff/users', {
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\s|-/g, '').trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        appRole,
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['staff', 'users'] });
      router.push(`/settings/users/${encodeURIComponent(data.userId)}`);
    },
  });

  if (!isAdmin) {
    return (
      <>
        <SettingsTabs />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Yalnızca sistem yöneticisi yeni personel oluşturabilir.
        </p>
      </>
    );
  }

  const err = createM.error as Error | undefined;
  const roleOptions = staffAssignableRoleOptions();

  return (
    <>
      <SettingsTabs />
      <PageHeader
        title="Yeni personel hesabı"
        description="E-posta ve şifre ile yönetim paneline giriş yapabilir. Telefon benzersiz olmalıdır."
        actions={
          <Link
            href="/settings/users"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Listeye dön
          </Link>
        }
      />

      <GlassCard className="max-w-xl">
        <form
          className="space-y-4 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Ad
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Soyad
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            E-posta (giriş)
            <input
              required
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Telefon
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Geçici şifre (min. 8 karakter)
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Panel rolü
            <select value={appRole} onChange={(e) => setAppRole(e.target.value)} className={inputClass}>
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {err ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={createM.isPending}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white',
              'hover:bg-brand/90 disabled:opacity-60',
            )}
          >
            {createM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Hesabı oluştur
          </button>
        </form>
      </GlassCard>
    </>
  );
}
