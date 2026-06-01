'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Mail,
  Package,
  Phone,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { apiBase, apiPatch, apiPost, apiTimeoutSignal, staffAuthHeaders, staffParseJsonRes } from '@/lib/api';
import { formatTry } from '@/lib/format';
import { cn } from '@/lib/cn';

type DetailResponse = {
  id: string;
  publicId: string;
  type: string;
  displayName: string;
  companyName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  billingAddress: string | null;
  userStatus: string;
  email: string | null;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  tcKimlikNo: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  memberSince: string;
  walletBalance: string;
  invoiceAccountEnabled: boolean;
  deliveryCount: number;
  savedAddressCount: number;
  createdAt: string;
  finance: {
    deliveredCount: number;
    grossRevenue: string;
    platformProfit: string;
    courierEarnings: string;
    avgOrderGross: string;
    openCount?: number;
    cancelledCount?: number;
    activeOrderCount?: number;
    activeGross?: string;
    activeCommission?: string;
  };
  recentDeliveries: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalPrice: string;
    commissionAmount?: string;
    createdAt: string;
  }>;
  consents: {
    registrationTerms: { granted: boolean; recordedAt: string; source: string } | null;
    marketingElectronic: { granted: boolean; recordedAt: string; source: string } | null;
  };
};

const TYPE_TR: Record<string, string> = {
  INDIVIDUAL: 'Bireysel',
  CORPORATE: 'Kurumsal',
  SOLE_PROPRIETOR: 'Şahıs işletmesi',
};

const USER_STATUS_TR: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SUSPENDED: 'Askıda',
  PENDING_APPROVAL: 'Onay bekliyor',
  REJECTED: 'Reddedildi',
};

const DELIVERY_STATUS_TR: Record<string, string> = {
  PENDING: 'Beklemede',
  POOL: 'Uygun kurye aranıyor',
  COURIER_ASSIGNED: 'Kurye atandı',
  COURIER_EN_ROUTE: 'Yolda',
  PACKAGE_PICKED_UP: 'Alındı',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
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

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
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

const detailKey = (publicId: string) => ['staff', 'customers', 'detail', publicId] as const;

const EMPTY_FINANCE: NonNullable<DetailResponse['finance']> = {
  deliveredCount: 0,
  grossRevenue: '0',
  platformProfit: '0',
  courierEarnings: '0',
  avgOrderGross: '0',
  openCount: 0,
  cancelledCount: 0,
  activeOrderCount: 0,
  activeGross: '0',
  activeCommission: '0',
};

function normalizeCustomerDetail(data: DetailResponse): DetailResponse {
  return {
    ...data,
    finance: data.finance ?? EMPTY_FINANCE,
    recentDeliveries: data.recentDeliveries.map((d) => ({
      ...d,
      commissionAmount: d.commissionAmount ?? '0',
    })),
  };
}

async function fetchCustomer(publicId: string): Promise<DetailResponse> {
  const res = await fetch(`${apiBase()}/staff/customers/${encodeURIComponent(publicId)}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return normalizeCustomerDetail(await staffParseJsonRes<DetailResponse>(res));
}

const inputClass =
  'mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200';

const btnPrimary =
  'rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50';

const btnSecondary =
  'rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50';

type TabId = 'general' | 'billing' | 'consents' | 'admin' | 'deliveries';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'Genel' },
  { id: 'billing', label: 'Fatura' },
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

export function CustomerDetailClient({ publicId }: { publicId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: detailKey(publicId),
    queryFn: () => fetchCustomer(publicId),
    retry: 1,
  });

  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdAgain, setPwdAgain] = useState('');
  const [pwdMismatch, setPwdMismatch] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const financeFromApi = Boolean(query.data?.finance);
  const c = query.data ? normalizeCustomerDetail(query.data) : undefined;
  const financeHasDelivered =
    financeFromApi && Number(c?.finance.deliveredCount ?? 0) > 0;
  const financeHasActiveVolume =
    financeFromApi && Number(c?.finance.activeOrderCount ?? 0) > 0;

  useEffect(() => {
    if (!c || c.type !== 'CORPORATE') return;
    setCompanyName(c.companyName ?? '');
    setTaxNumber(c.taxNumber ?? '');
  }, [c?.companyName, c?.taxNumber, c?.type]);

  useEffect(() => {
    if (query.data && !query.data.finance) {
      void query.refetch();
    }
  }, [query.data, query.refetch]);

  const setDetail = (data: DetailResponse) => {
    qc.setQueryData(detailKey(publicId), normalizeCustomerDetail(data));
    void qc.invalidateQueries({ queryKey: ['staff', 'customers'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'PASSIVE') =>
      apiPatch<DetailResponse>(`/staff/customers/${encodeURIComponent(publicId)}/status`, { status }),
    onSuccess: setDetail,
  });

  const invoiceMutation = useMutation({
    mutationFn: (invoiceAccountEnabled: boolean) =>
      apiPatch<DetailResponse>(`/staff/customers/${encodeURIComponent(publicId)}`, { invoiceAccountEnabled }),
    onSuccess: setDetail,
  });

  const corporateMutation = useMutation({
    mutationFn: () =>
      apiPatch<DetailResponse>(`/staff/customers/${encodeURIComponent(publicId)}`, {
        companyName: companyName.trim(),
        taxNumber: taxNumber.trim(),
      }),
    onSuccess: setDetail,
  });

  const walletMutation = useMutation({
    mutationFn: () =>
      apiPost<DetailResponse>(`/staff/customers/${encodeURIComponent(publicId)}/wallet-adjustment`, {
        amount: walletAmount.trim(),
        reason: walletReason.trim(),
      }),
    onSuccess: (data) => {
      setDetail(data);
      setWalletAmount('');
      setWalletReason('');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (password: string) =>
      apiPatch<DetailResponse>(`/staff/customers/${encodeURIComponent(publicId)}/password`, { password }),
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
        <Link href="/customers" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
          ← Müşteri listesine dön
        </Link>
      </div>
    );
  }

  const hasBillingProfile = c.type === 'CORPORATE' || c.type === 'SOLE_PROPRIETOR';
  const personName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Müşteri listesi
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
        {/* Üst bilgi */}
        <div className="border-b border-zinc-100 px-5 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{c.displayName}</h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">{c.publicId}</p>
          <p className="mt-2 text-sm text-zinc-600">
            {TYPE_TR[c.type] ?? c.type}
            <span className="mx-1.5 text-zinc-300">·</span>
            <span className="font-medium text-zinc-800">{USER_STATUS_TR[c.userStatus] ?? c.userStatus}</span>
          </p>

          {(c.userStatus === 'ACTIVE' || c.userStatus === 'PASSIVE') && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => {
                  if (c.userStatus === 'PASSIVE') {
                    statusMutation.mutate('ACTIVE');
                    return;
                  }
                  if (
                    typeof window !== 'undefined' &&
                    !window.confirm('Müşteri pasife alınsın mı? Uygulamadan giriş yapılamaz.')
                  ) {
                    return;
                  }
                  statusMutation.mutate('PASSIVE');
                }}
                className={btnSecondary}
              >
                {c.userStatus === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}
              </button>
              {statusMutation.isError ? (
                <span className="text-xs text-zinc-600">{(statusMutation.error as Error).message}</span>
              ) : null}
            </div>
          )}
        </div>

        {/* Özet metrikler */}
        <div className="grid divide-y border-b border-zinc-100 sm:grid-cols-2 lg:grid-cols-5 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Cüzdan</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
              {formatTry(c.walletBalance)}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Brüt ciro</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
              {financeHasDelivered ? formatTry(c.finance.grossRevenue) : '—'}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {financeHasDelivered
                ? `${c.finance.deliveredCount} teslim edilen`
                : 'Teslim sonrası hesaplanır'}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Platform karı</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-brand">
              {financeHasDelivered ? formatTry(c.finance.platformProfit) : '—'}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400">Komisyon (KDV hariç hizmet payı)</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Teslimat</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">{c.deliveryCount}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Kayıtlı adres</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">{c.savedAddressCount}</p>
          </div>
        </div>

        <div className="border-b border-zinc-200 px-5" role="tablist" aria-label="Müşteri bilgileri">
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
                  <Field label="Ad" value={c.firstName ?? ''} />
                  <Field label="Soyad" value={c.lastName ?? ''} />
                  <Field label="Görünen ad" value={personName || c.displayName} />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Telefon</p>
                    <a
                      href={`tel:${c.phone.replace(/\s/g, '')}`}
                      className="mt-0.5 block font-mono text-xs text-zinc-800 hover:underline"
                    >
                      {c.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">E-posta</p>
                    <p className="mt-0.5 break-all text-sm text-zinc-800">{c.email ?? '—'}</p>
                  </div>
                  <Field label="T.C. Kimlik no" value={c.tcKimlikNo ?? ''} mono />
                  <Field label="Telefon doğrulama" value={formatDateTime(c.phoneVerifiedAt)} />
                  <Field label="Son giriş" value={formatDateTime(c.lastLoginAt)} />
                  <Field label="Üyelik tarihi" value={formatDateTime(c.memberSince)} />
                </div>
              </div>
              <div>
                <SectionTitle>Hesap özeti</SectionTitle>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Müşteri no" value={c.publicId} mono />
                  <Field label="Hesap türü" value={TYPE_TR[c.type] ?? c.type} />
                  <Field label="Profil oluşturma" value={formatDateTime(c.createdAt)} />
                  <Field
                    label="Fatura hesabı (cari)"
                    value={c.invoiceAccountEnabled ? 'Açık' : 'Kapalı'}
                  />
                </div>
              </div>
              <div>
                <SectionTitle>Finans</SectionTitle>
                <p className="mt-1 text-xs text-zinc-500">
                  Brüt ciro ve platform karı yalnızca <strong className="font-medium">teslim edilmiş</strong>{' '}
                  siparişlerden hesaplanır. Devam eden veya iptal siparişler aşağıdaki özet satırlarında
                  gösterilir.
                </p>
                {!financeFromApi ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Finans özeti API’den alınamadı. Üstteki <strong>Yenile</strong> ile tekrar deneyin; devam
                    ederse API sunucusunu yeniden başlatın (güncel kod gerekir).
                  </p>
                ) : null}
                {!financeHasDelivered && c.deliveryCount > 0 ? (
                  <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    Bu müşteride {c.deliveryCount} sipariş kayıtlı; henüz teslim edilmiş sipariş yok (
                    {c.finance.openCount ?? 0} devam ediyor, {c.finance.cancelledCount ?? 0} iptal). Ciro ve
                    kar teslim tamamlandıktan sonra burada görünür.
                  </p>
                ) : null}
                {!financeHasDelivered && c.deliveryCount === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">Bu müşteriye ait henüz sipariş yok.</p>
                ) : null}
                {financeHasDelivered ? (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Brüt ciro (teslim)" value={formatTry(c.finance.grossRevenue)} />
                    <Field label="Platform karı (komisyon)" value={formatTry(c.finance.platformProfit)} />
                    <Field label="Ort. sipariş (brüt)" value={formatTry(c.finance.avgOrderGross)} />
                    <Field
                      label="Teslim edilen sipariş"
                      value={String(c.finance.deliveredCount)}
                    />
                    <Field
                      label="Kurye ödemeleri (toplam)"
                      value={formatTry(c.finance.courierEarnings)}
                    />
                  </div>
                ) : null}
                {financeHasActiveVolume && !financeHasDelivered ? (
                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      Sipariş hacmi (iptal hariç, henüz teslim yok)
                    </p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Sipariş tutarı toplamı"
                        value={formatTry(c.finance.activeGross ?? '0')}
                      />
                      <Field
                        label="Komisyon (tahmini)"
                        value={formatTry(c.finance.activeCommission ?? '0')}
                      />
                      <Field
                        label="Aktif sipariş adedi"
                        value={String(c.finance.activeOrderCount ?? 0)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'billing' ? (
            <div className="space-y-6">
              <div>
                <SectionTitle icon={FileText}>Fatura ve vergi bilgileri</SectionTitle>
                {hasBillingProfile ? (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {c.type === 'CORPORATE' ? (
                      <Field label="Şirket ünvanı" value={c.companyName ?? ''} full />
                    ) : null}
                    <Field label="Vergi kimlik no (VKN)" value={c.taxNumber ?? ''} mono />
                    <Field label="Vergi dairesi" value={c.taxOffice ?? ''} />
                    {c.type === 'CORPORATE' ? (
                      <Field label="Yetkili T.C. Kimlik no" value={c.tcKimlikNo ?? ''} mono />
                    ) : null}
                    <Field label="Fatura adresi" value={c.billingAddress ?? ''} full />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    Bireysel hesaplarda vergi ve fatura adresi bilgisi tutulmaz. T.C. Kimlik bilgisi Genel
                    sekmesindedir.
                  </p>
                )}
              </div>
              <div>
                <SectionTitle icon={Wallet}>Cari hesap ayarı</SectionTitle>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={c.invoiceAccountEnabled}
                    disabled={invoiceMutation.isPending}
                    onChange={(e) => invoiceMutation.mutate(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                  />
                  <span className="text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">Fatura hesabı (cari ödeme) etkin</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      Açıkken müşteri teslimatta cari hesap ile ödeme seçebilir.
                    </span>
                  </span>
                </label>
                {invoiceMutation.isError ? (
                  <p className="mt-2 text-xs text-zinc-600">{(invoiceMutation.error as Error).message}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'consents' ? (
            <div>
              <SectionTitle>Onaylar ve izinler</SectionTitle>
              <p className="mt-1 text-xs text-zinc-500">Kayıt sırasında verilen sözleşme ve ileti izinleri</p>
              <div className="mt-4 space-y-5">
                <ConsentItem label="Kayıt sözleşmeleri" snapshot={c.consents.registrationTerms} />
                <ConsentItem
                  label="Kampanya ve ticari elektronik ileti"
                  snapshot={c.consents.marketingElectronic}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'admin' ? (
            <div className="space-y-6 max-w-xl">
              {c.type === 'CORPORATE' ? (
                <div>
                  <p className="text-sm font-medium text-zinc-900">Kurumsal bilgi güncelleme</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Şirket ünvanı ve vergi numarası</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-medium uppercase text-zinc-400">Şirket ünvanı</label>
                      <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase text-zinc-400">Vergi no</label>
                      <input
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        className={cn(inputClass, 'font-mono')}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={corporateMutation.isPending}
                        onClick={() => corporateMutation.mutate()}
                        className={btnSecondary}
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                  {corporateMutation.isError ? (
                    <p className="mt-2 text-xs text-zinc-600">{(corporateMutation.error as Error).message}</p>
                  ) : null}
                </div>
              ) : null}

              <div className={c.type === 'CORPORATE' ? 'border-t border-zinc-100 pt-6' : ''}>
                <p className="text-sm font-medium text-zinc-900">Cüzdan düzeltmesi</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Pozitif veya negatif tutar. Bakiye negatif olamaz; işlem geçmişe yazılır.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-medium uppercase text-zinc-400">Tutar (TRY)</label>
                    <input
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder="250 veya -50"
                      className={cn(inputClass, 'font-mono')}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-medium uppercase text-zinc-400">Açıklama</label>
                    <textarea
                      value={walletReason}
                      onChange={(e) => setWalletReason(e.target.value)}
                      rows={2}
                      placeholder="En az 3 karakter"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={walletMutation.isPending}
                      onClick={() => walletMutation.mutate()}
                      className={btnSecondary}
                    >
                      Uygula
                    </button>
                  </div>
                </div>
                {walletMutation.isError ? (
                  <p className="mt-2 text-xs text-zinc-600">{(walletMutation.error as Error).message}</p>
                ) : null}
              </div>

              <div className="border-t border-zinc-100 pt-6">
                <p className="text-sm font-medium text-zinc-900">Şifre sıfırlama</p>
                <p className="mt-0.5 text-xs text-zinc-500">Müşteri uygulaması giriş şifresini değiştirir.</p>
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

          {activeTab === 'deliveries' ? (
            <div>
              <SectionTitle icon={Package}>Teslimatlar</SectionTitle>
              <p className="mt-1 text-xs text-zinc-500">{c.deliveryCount} teslimat kayıtlı</p>
              {c.recentDeliveries.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">Henüz teslimat yok.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-100">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Sipariş</th>
                        <th className="px-3 py-2">Durum</th>
                        <th className="px-3 py-2">Tutar</th>
                        <th className="px-3 py-2">Komisyon</th>
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
                            {DELIVERY_STATUS_TR[d.status] ?? d.status}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{formatTry(d.totalPrice)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-brand">
                            {formatTry(d.commissionAmount ?? '0')}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-zinc-500">
                            {formatDateTime(d.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
