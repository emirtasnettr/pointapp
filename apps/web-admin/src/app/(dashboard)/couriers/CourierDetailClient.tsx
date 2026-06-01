'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CreditCard,
  Landmark,
  Loader2,
  Mail,
  Package,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { apiBase, apiPatch, apiTimeoutSignal, staffAuthHeaders, staffParseJsonRes } from '@/lib/api';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { formatTry } from '@/lib/format';
import { cn } from '@/lib/cn';

type CourierDetail = {
  id: string;
  publicId: string;
  type: string;
  vehicleType: string;
  plate: string | null;
  iban: string | null;
  displayName: string;
  user: {
    email: string | null;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
  };
  wallet: { balance: string; pending: string; currency: string } | null;
  deliveredCount: number;
  createdAt: string;
  updatedAt: string;
  recentDeliveries: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalPrice: string;
    createdAt: string;
    updatedAt: string;
  }>;
  consents: {
    registrationTerms: { granted: boolean; recordedAt: string; source: string } | null;
    marketingNotifications: { granted: boolean; recordedAt: string; source: string } | null;
  };
};

const TYPE_TR: Record<string, string> = {
  INDIVIDUAL: 'Bireysel',
  MERCHANT: 'Esnaf',
};

const VEHICLE_TR: Record<string, string> = {
  MOTORCYCLE: 'Motosiklet',
  CAR: 'Otomobil',
};

const USER_STATUS_TR: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SUSPENDED: 'Askıda',
  PENDING_APPROVAL: 'Onay bekliyor',
  REJECTED: 'Reddedildi',
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </h2>
  );
}

function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm text-zinc-800',
          mono && 'font-mono text-xs',
          full && 'whitespace-pre-wrap leading-relaxed',
        )}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function ConsentItem({
  label,
  snapshot,
}: {
  label: string;
  snapshot: { granted: boolean; recordedAt: string; source: string } | null;
}) {
  if (!snapshot) {
    return (
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <p className="mt-0.5 text-xs text-zinc-400">Kayıt yok</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-medium text-zinc-800">{label}</p>
      <p className="mt-0.5 text-xs text-zinc-600">
        {snapshot.granted ? 'Onay verildi' : 'Onay verilmedi'}
        <span className="text-zinc-400"> · </span>
        {formatDateTime(snapshot.recordedAt)}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-400">Kaynak: {snapshot.source}</p>
    </div>
  );
}

const detailKey = (publicId: string) => ['staff', 'couriers', 'detail', publicId] as const;

async function fetchCourier(publicId: string): Promise<CourierDetail> {
  const res = await fetch(`${apiBase()}/staff/couriers/${encodeURIComponent(publicId)}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<CourierDetail>(res);
}

const inputClass =
  'mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200';

const btnPrimary =
  'rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50';

const btnSecondary =
  'rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50';

type TabId = 'general' | 'wallet' | 'consents' | 'deliveries' | 'admin';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'Genel' },
  { id: 'wallet', label: 'Cüzdan' },
  { id: 'consents', label: 'Onaylar' },
  { id: 'deliveries', label: 'Teslimatlar' },
  { id: 'admin', label: 'Yönetim' },
];

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
        active
          ? 'border-zinc-900 text-zinc-900'
          : 'border-transparent text-zinc-500 hover:border-zinc-200 hover:text-zinc-800',
      )}
    >
      {children}
    </button>
  );
}

export function CourierDetailClient({ publicId }: { publicId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: detailKey(publicId),
    queryFn: () => fetchCourier(publicId),
    retry: 1,
  });

  const [pwdNew, setPwdNew] = useState('');
  const [pwdAgain, setPwdAgain] = useState('');
  const [pwdMismatch, setPwdMismatch] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const c = query.data;

  const setDetail = (data: CourierDetail) => {
    qc.setQueryData(detailKey(publicId), data);
    void qc.invalidateQueries({ queryKey: ['staff', 'couriers'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'PASSIVE') =>
      apiPatch<CourierDetail>(`/staff/couriers/${encodeURIComponent(publicId)}/status`, { status }),
    onSuccess: setDetail,
  });

  const passwordMutation = useMutation({
    mutationFn: (password: string) =>
      apiPatch<CourierDetail>(`/staff/couriers/${encodeURIComponent(publicId)}/password`, { password }),
    onSuccess: (data) => {
      setDetail(data);
      setPwdNew('');
      setPwdAgain('');
      setPwdMismatch(false);
    },
  });

  if (query.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
      </div>
    );
  }

  if (query.isError || !c) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {(query.error as Error).message}
        </p>
        <Link href="/couriers" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
          ← Kurye listesine dön
        </Link>
      </div>
    );
  }

  const personName = [c.user.firstName, c.user.lastName].filter(Boolean).join(' ').trim();
  const walletBalance = c.wallet?.balance ?? '0';
  const walletPending = c.wallet?.pending ?? '0';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/couriers"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Kurye listesi
        </Link>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', query.isFetching && 'animate-spin')} aria-hidden />
          Yenile
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{c.displayName}</h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">{c.publicId}</p>
          <p className="mt-2 text-sm text-zinc-600">
            {TYPE_TR[c.type] ?? c.type}
            <span className="mx-1.5 text-zinc-300">·</span>
            {VEHICLE_TR[c.vehicleType] ?? c.vehicleType}
            {c.plate ? (
              <>
                <span className="mx-1.5 text-zinc-300">·</span>
                <span className="font-mono text-xs">{c.plate}</span>
              </>
            ) : null}
            <span className="mx-1.5 text-zinc-300">·</span>
            <span className="font-medium text-zinc-800">
              {USER_STATUS_TR[c.user.status] ?? c.user.status}
            </span>
          </p>

          {(c.user.status === 'ACTIVE' || c.user.status === 'PASSIVE') && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => {
                  if (c.user.status === 'PASSIVE') {
                    statusMutation.mutate('ACTIVE');
                    return;
                  }
                  if (
                    typeof window !== 'undefined' &&
                    !window.confirm('Kurye hesabı pasife alınsın mı? Uygulamadan giriş yapılamaz.')
                  ) {
                    return;
                  }
                  statusMutation.mutate('PASSIVE');
                }}
                className={btnSecondary}
              >
                {c.user.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}
              </button>
              {statusMutation.isError ? (
                <span className="text-xs text-zinc-600">{(statusMutation.error as Error).message}</span>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid divide-y border-b border-zinc-100 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Cüzdan bakiye</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
              {c.wallet ? formatTry(walletBalance) : '—'}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Bekleyen hakediş</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
              {c.wallet ? formatTry(walletPending) : '—'}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Teslim edilen</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">{c.deliveredCount}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Plaka</p>
            <p className="mt-0.5 font-mono text-base font-semibold text-zinc-900">{c.plate ?? '—'}</p>
          </div>
        </div>

        <div className="border-b border-zinc-200 px-5" role="tablist" aria-label="Kurye bilgileri">
          <div className="-mb-px flex gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>

        <div className="px-5 py-5" role="tabpanel">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              <div>
                <SectionTitle icon={Phone}>Kişi ve iletişim</SectionTitle>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Ad" value={c.user.firstName ?? ''} />
                  <Field label="Soyad" value={c.user.lastName ?? ''} />
                  <Field label="Görünen ad" value={personName || c.displayName} />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Telefon</p>
                    <a
                      href={`tel:${c.user.phone.replace(/\s/g, '')}`}
                      className="mt-0.5 block font-mono text-xs text-zinc-800 hover:underline"
                    >
                      {c.user.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">E-posta</p>
                    <p className="mt-0.5 break-all text-sm text-zinc-800">{c.user.email ?? '—'}</p>
                  </div>
                </div>
              </div>
              <div>
                <SectionTitle>Hesap özeti</SectionTitle>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Kurye no" value={c.publicId} mono />
                  <Field label="Hesap türü" value={TYPE_TR[c.type] ?? c.type} />
                  <Field label="Araç" value={VEHICLE_TR[c.vehicleType] ?? c.vehicleType} />
                  <Field label="Plaka" value={c.plate ?? ''} mono />
                  <Field label="Hesap durumu" value={USER_STATUS_TR[c.user.status] ?? c.user.status} />
                  <Field label="Kayıt tarihi" value={formatDateTime(c.createdAt)} />
                  <Field label="Son güncelleme" value={formatDateTime(c.updatedAt)} />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'wallet' ? (
            <div className="space-y-6">
              <div>
                <SectionTitle icon={CreditCard}>Cüzdan</SectionTitle>
                {c.wallet ? (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Çekilebilir bakiye" value={formatTry(c.wallet.balance)} />
                    <Field label="Bekleyen hakediş" value={formatTry(c.wallet.pending)} />
                    <Field label="Para birimi" value={c.wallet.currency} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">Bu kurye için cüzdan kaydı bulunamadı.</p>
                )}
              </div>
              <div>
                <SectionTitle icon={Landmark}>Ödeme bilgisi</SectionTitle>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="IBAN" value={c.iban ?? ''} mono full />
                </div>
                {!c.iban ? (
                  <p className="mt-2 text-xs text-zinc-500">Kayıt sırasında IBAN girilmemiş.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'consents' ? (
            <div>
              <SectionTitle>Onaylar ve izinler</SectionTitle>
              <p className="mt-1 text-xs text-zinc-500">Kayıt sırasında verilen sözleşme ve bildirim izinleri</p>
              <div className="mt-4 space-y-5">
                <ConsentItem
                  label="Kayıt sözleşmeleri (iş ortaklığı, platform, KVKK, hakediş, operasyon, sorumluluk)"
                  snapshot={c.consents.registrationTerms}
                />
                <ConsentItem
                  label="Kampanya, duyuru ve bilgilendirme mesajları"
                  snapshot={c.consents.marketingNotifications}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'deliveries' ? (
            <div>
              <SectionTitle icon={Package}>Teslimatlar</SectionTitle>
              <p className="mt-1 text-xs text-zinc-500">
                {c.deliveredCount} teslim edilmiş · son {c.recentDeliveries.length} kayıt
              </p>
              {c.recentDeliveries.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">Henüz atanmış teslimat yok.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-100">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Sipariş</th>
                        <th className="px-3 py-2">Durum</th>
                        <th className="px-3 py-2">Tutar</th>
                        <th className="px-3 py-2">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {c.recentDeliveries.map((d) => (
                        <tr key={d.id} className="text-zinc-700">
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/orders/${d.orderNumber}`}
                              className="font-mono text-xs font-medium text-zinc-900 hover:underline"
                            >
                              #{d.orderNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-zinc-600">
                            {deliveryStatusLabel(d.status)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{formatTry(d.totalPrice)}</td>
                          <td className="px-3 py-2.5 text-xs text-zinc-500">
                            {formatDateTime(d.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'admin' ? (
            <div className="max-w-xl space-y-6">
              <div>
                <p className="text-sm font-medium text-zinc-900">Şifre sıfırlama</p>
                <p className="mt-0.5 text-xs text-zinc-500">Kurye uygulaması giriş şifresini değiştirir.</p>
                <div className="mt-3 grid max-w-sm gap-2">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwdNew}
                    onChange={(e) => {
                      setPwdNew(e.target.value);
                      setPwdMismatch(false);
                      passwordMutation.reset();
                    }}
                    placeholder="Yeni şifre (min. 8)"
                    className={inputClass}
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwdAgain}
                    onChange={(e) => {
                      setPwdAgain(e.target.value);
                      setPwdMismatch(false);
                      passwordMutation.reset();
                    }}
                    placeholder="Yeni şifre tekrar"
                    className={inputClass}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={passwordMutation.isPending || pwdNew.length < 8}
                      onClick={() => {
                        if (pwdNew !== pwdAgain) {
                          setPwdMismatch(true);
                          return;
                        }
                        setPwdMismatch(false);
                        passwordMutation.mutate(pwdNew);
                      }}
                      className={btnPrimary}
                    >
                      Şifreyi güncelle
                    </button>
                    {passwordMutation.isError ? (
                      <span className="text-xs text-zinc-600">{(passwordMutation.error as Error).message}</span>
                    ) : null}
                    {pwdMismatch ? <span className="text-xs text-zinc-600">Şifreler eşleşmiyor.</span> : null}
                    {passwordMutation.isSuccess ? (
                      <span className="text-xs text-zinc-600">Güncellendi.</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
