'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/cn';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { formatTry } from '@/lib/format';

type FinanceOverview = {
  summary: {
    todayCollectedGross: string;
    todayCommission: string;
    pendingPaymentCount: number;
    pendingPaymentAmountGross: string;
  };
  recentDeliveries: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalPrice: string;
    commissionAmount: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
    customer: { publicId: string; displayName: string };
  }>;
};

const PAYMENT_METHOD_TR: Record<string, string> = {
  CARD: 'Kart',
  WALLET: 'Cüzdan',
  INVOICE_ACCOUNT: 'Cari',
};

const PAYMENT_STATUS_TR: Record<string, string> = {
  PENDING: 'Beklemede',
  AUTHORIZED: 'Yetkili',
  CAPTURED: 'Tahsil',
  FAILED: 'Başarısız',
  REFUNDED: 'İade',
};

function paymentStatusStyle(s: string) {
  switch (s) {
    case 'CAPTURED':
    case 'AUTHORIZED':
      return 'bg-emerald-500/12 text-emerald-900 ring-emerald-500/20';
    case 'PENDING':
      return 'bg-amber-500/12 text-amber-900 ring-amber-500/25';
    case 'FAILED':
      return 'bg-red-500/12 text-red-900 ring-red-400/25';
    case 'REFUNDED':
      return 'bg-zinc-500/10 text-zinc-700 ring-zinc-400/20';
    default:
      return 'bg-zinc-500/10 text-zinc-700 ring-zinc-400/15';
  }
}

function fmtShort(iso: string) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function FinancePage() {
  const q = useQuery({
    queryKey: ['staff', 'finance', 'overview'],
    queryFn: () => apiGet<FinanceOverview>('/staff/finance/overview'),
    retry: 1,
  });

  const s = q.data?.summary;

  return (
    <>
      <PageHeader
        title="Finans Yönetimi"
        description="Tahsilat ve komisyon özeti; sipariş bazlı ödeme durumu. Üst kartlar UTC takvim gününe göre hesaplanır (bugün oluşturulan siparişlerden tahsil edilmiş veya yetkili ödemeler)."
      />
      {q.isError ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(q.error as Error).message.includes('Oturum gerekli') ? (
            <>{(q.error as Error).message}</>
          ) : (
            <>
              Veri alınamadı: {(q.error as Error).message}. API ve{' '}
              <Link href="/auth/login" className="font-medium text-brand hover:underline">
                yönetim girişi
              </Link>{' '}
              kontrol edin.
            </>
          )}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <GlassCard className="p-4">
          <p className="text-xs text-zinc-500">Bugün tahsilat (brüt)</p>
          <p className="mt-1 flex items-baseline gap-2 text-lg font-semibold text-zinc-900">
            {q.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden />
            ) : (
              formatTry(s?.todayCollectedGross ?? '0')
            )}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-zinc-500">Bekleyen ödemeler</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {q.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden />
            ) : (
              <>
                {s?.pendingPaymentCount ?? 0}{' '}
                <span className="text-sm font-normal text-zinc-500">
                  ({formatTry(s?.pendingPaymentAmountGross ?? '0')} brüt)
                </span>
              </>
            )}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-zinc-500">Komisyon (bugün)</p>
          <p className="mt-1 flex items-baseline gap-2 text-lg font-semibold text-brand">
            {q.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden />
            ) : (
              formatTry(s?.todayCommission ?? '0')
            )}
          </p>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="border-b border-zinc-200/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Son siparişler ve ödeme</h2>
          <p className="mt-0.5 text-xs text-zinc-500">En yeni 75 teslimat kaydı — sipariş numarasına tıklayıp detaya gidebilirsiniz.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5">Sipariş</th>
                <th className="px-4 py-2.5">Müşteri</th>
                <th className="px-4 py-2.5">Durum</th>
                <th className="px-4 py-2.5">Tutar</th>
                <th className="px-4 py-2.5">Komisyon</th>
                <th className="px-4 py-2.5">Ödeme</th>
                <th className="px-4 py-2.5">Ödeme durumu</th>
                <th className="px-4 py-2.5">Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {q.isPending ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" aria-hidden />
                  </td>
                </tr>
              ) : q.data?.recentDeliveries?.length ? (
                q.data.recentDeliveries.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100/90 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-2.5 font-medium tabular-nums">
                      <Link
                        href={`/orders/${r.orderNumber}`}
                        className="text-brand hover:underline"
                      >
                        #{r.orderNumber}
                      </Link>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-zinc-700" title={r.customer.displayName}>
                      {r.customer.displayName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-600">{deliveryStatusLabel(r.status)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-900">{formatTry(r.totalPrice)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-600">{formatTry(r.commissionAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-600">
                      {PAYMENT_METHOD_TR[r.paymentMethod] ?? r.paymentMethod}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                          paymentStatusStyle(r.paymentStatus),
                        )}
                      >
                        {PAYMENT_STATUS_TR[r.paymentStatus] ?? r.paymentStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">{fmtShort(r.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    Henüz teslimat kaydı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </>
  );
}
