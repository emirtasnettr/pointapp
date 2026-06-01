'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Lock,
  Mail,
  Phone,
  Shield,
  Truck,
  UserRound,
} from 'lucide-react';
import { GlassCard } from '@/components/customer/GlassCard';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { cn } from '@/lib/cn';

type MeResponse = {
  customerPublicId: string;
  type?: 'INDIVIDUAL' | 'CORPORATE';
  companyName?: string | null;
  senderName?: string | null;
  email?: string | null;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  invoiceAccountEnabled?: boolean;
};

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

function displayName(me: MeResponse | undefined) {
  if (!me) return '—';
  const n = [me.firstName, me.lastName].filter(Boolean).join(' ').trim();
  if (n) return n;
  if (me.type === 'CORPORATE' && me.companyName?.trim()) return me.companyName.trim();
  return 'Müşteri';
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('90')) {
    return `+90 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  return phone;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-3.5 border-b border-zinc-100 py-4 last:border-0 last:pb-0 first:pt-0 dark:border-white/10">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <p
          className={cn(
            'mt-1 break-words text-[15px] font-semibold text-zinc-900 dark:text-zinc-50',
            mono && 'font-mono text-sm tracking-tight',
            highlight && 'text-brand',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="relative mt-1.5">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={cn(fieldClass, 'pr-11')}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/10"
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export function CustomerAccountPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => apiGetAuth<MeResponse>('/customer/me'),
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [formOk, setFormOk] = useState(false);

  const name = useMemo(() => displayName(data), [data]);
  const accountType =
    data?.type === 'CORPORATE' ? 'Kurumsal müşteri' : data?.type === 'INDIVIDUAL' ? 'Bireysel müşteri' : '—';

  const passwordMutation = useMutation({
    mutationFn: () =>
      apiPatchAuth<{ ok: true }>('/customer/me/password', {
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFormErr(null);
      setFormOk(true);
    },
    onError: (e: Error) => {
      setFormOk(false);
      setFormErr(e.message);
    },
  });

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormOk(false);
    if (newPassword.length < 8) {
      setFormErr('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormErr('Yeni şifre tekrarı eşleşmiyor.');
      return;
    }
    setFormErr(null);
    passwordMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Hesabım</h1>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          Profil bilgileriniz ve güvenlik ayarlarınız.
        </p>
      </div>

      {isError ? (
        <p className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {(error as Error).message}
        </p>
      ) : null}

      <GlassCard className="relative overflow-hidden p-0">
        <div
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-brand/20 via-brand/5 to-transparent"
          aria-hidden
        />
        <div className="relative px-6 pb-6 pt-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:gap-5 sm:text-left">
            <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-3xl bg-brand text-white shadow-soft">
              {isPending ? (
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              ) : (
                <UserRound className="h-8 w-8" strokeWidth={2} aria-hidden />
              )}
            </span>
            <div className="mt-4 min-w-0 sm:mt-0 sm:flex-1">
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {isPending ? 'Yükleniyor…' : name}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                  <Fingerprint className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                  {data?.customerPublicId ?? '—'}
                </span>
                {!isPending && data?.invoiceAccountEnabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                    <Building2 className="h-3.5 w-3.5 text-brand" aria-hidden />
                    Cari hesap
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">Hesap özeti</h2>
        <GlassCard className="p-0">
          <div className="px-5 py-1">
            <InfoRow icon={UserRound} label="Hesap türü" value={isPending ? '…' : accountType} />
            {data?.type === 'CORPORATE' && data.companyName ? (
              <InfoRow icon={Building2} label="Şirket ünvanı" value={data.companyName} />
            ) : null}
            <InfoRow
              icon={Truck}
              label="Gönderici adı (siparişlerde)"
              value={data?.senderName?.trim() || name}
              highlight
            />
          </div>
        </GlassCard>
        <p className="text-xs leading-relaxed text-zinc-500">
          Teslimatlarınız bu gönderici adıyla oluşturulur. Değişiklik için müşteri hizmetleri ile iletişime geçin.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">İletişim</h2>
        <GlassCard className="p-0">
          <div className="px-5 py-1">
            <InfoRow icon={Mail} label="E-posta" value={data?.email?.trim() || '—'} />
            <InfoRow
              icon={Phone}
              label="Telefon"
              value={data?.phone ? formatPhone(data.phone) : '—'}
              mono
            />
          </div>
        </GlassCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">Güvenlik</h2>
        <GlassCard>
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
              <Shield className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">Şifre değiştir</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Güvenliğiniz için mevcut şifrenizi doğrulayıp yeni şifrenizi belirleyin. En az 8 karakter kullanın.
              </p>
            </div>
          </div>

          {formOk ? (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/10 px-3 py-2.5 text-sm font-medium text-brand">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Şifreniz güncellendi.
            </p>
          ) : null}

          {formErr ? (
            <p className="mb-4 rounded-xl border border-red-200/90 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {formErr}
            </p>
          ) : null}

          <form onSubmit={submitPassword} className="space-y-4">
            <PasswordField
              label="Mevcut şifre"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrent}
              onToggleVisible={() => setShowCurrent((v) => !v)}
              autoComplete="current-password"
            />
            <PasswordField
              label="Yeni şifre"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNew}
              onToggleVisible={() => setShowNew((v) => !v)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Yeni şifre (tekrar)"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirm}
              onToggleVisible={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px] sm:px-8"
            >
              {passwordMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Lock className="h-4 w-4" aria-hidden />
              )}
              Şifreyi güncelle
            </button>
          </form>
        </GlassCard>
      </section>
    </div>
  );
}
