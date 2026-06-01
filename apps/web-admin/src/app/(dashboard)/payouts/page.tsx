'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet, apiPatch, openStaffPayoutInvoice } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTry } from '@/lib/format';

type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

type PayoutItem = {
  id: string;
  amount: string;
  status: PayoutStatus;
  iban: string | null;
  note: string | null;
  paidAt: string | null;
  paidByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  invoice: { mime: string | null; fileName: string } | null;
  courier: {
    publicId: string;
    displayName: string;
    phone: string;
    walletBalance: string | null;
    walletCurrency: string;
  };
};

type ListResponse = {
  counts: Record<string, number>;
  items: PayoutItem[];
};

const STATUS_TR: Record<PayoutStatus, string> = {
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylı',
  PAID: 'Ödendi',
  REJECTED: 'Reddedildi',
};

const STATUS_STYLE: Record<PayoutStatus, string> = {
  PENDING: 'bg-amber-500/12 text-amber-900 ring-amber-500/25',
  APPROVED: 'bg-sky-500/12 text-sky-900 ring-sky-500/25',
  PAID: 'bg-emerald-500/12 text-emerald-900 ring-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-900 ring-red-400/20',
};

const FILTERS: { value: '' | PayoutStatus; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING', label: 'Bekliyor' },
  { value: 'APPROVED', label: 'Onaylı' },
  { value: 'PAID', label: 'Ödendi' },
  { value: 'REJECTED', label: 'Reddedildi' },
];

function fmtShort(iso: string) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function PayoutsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'' | PayoutStatus>('');
  const [invoiceOpeningId, setInvoiceOpeningId] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['staff', 'payout-requests', filter],
    queryFn: () => {
      const q = filter ? `?status=${encodeURIComponent(filter)}` : '';
      return apiGet<ListResponse>(`/staff/payout-requests${q}`);
    },
    retry: 1,
  });

  const patchM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'PAID' | 'REJECTED' }) => {
      return apiPatch<PayoutItem>(`/staff/payout-requests/${encodeURIComponent(id)}`, { status });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff', 'payout-requests'] });
    },
  });

  const counts = listQ.data?.counts ?? {};

  const filterButtons = useMemo(
    () =>
      FILTERS.map((f) => {
        const count = f.value ? counts[f.value] ?? 0 : null;
        const active = filter === f.value;
        return (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
              active
                ? 'bg-brand text-white ring-brand'
                : 'bg-white/80 text-zinc-600 ring-zinc-200 hover:bg-zinc-50',
            )}
          >
            {f.label}
            {f.value && count != null ? ` (${count})` : null}
          </button>
        );
      }),
    [counts, filter],
  );

  return (
    <>
      <PageHeader
        title="Hakediş Yönetimi"
        description="Kurye ödeme talepleri ve yüklenen faturalar. Onay, «Ödendi» (cüzdandan düşüm + defter) veya red."
      />

      {listQ.isError ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(listQ.error as Error).message.includes('Oturum gerekli') ? (
            <>{(listQ.error as Error).message}</>
          ) : (
            <>
              Veri alınamadı: {(listQ.error as Error).message}.{' '}
              <Link href="/auth/login" className="font-medium text-brand hover:underline">
                Giriş
              </Link>{' '}
              ve API adresini kontrol edin.
            </>
          )}
        </p>
      ) : null}

      {patchM.isError ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {(patchM.error as Error).message}
        </p>
      ) : null}

      <GlassCard className="mb-4 flex flex-wrap items-center gap-2 p-3">
        {filterButtons}
        <button
          type="button"
          onClick={() => void listQ.refetch()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', listQ.isFetching && 'animate-spin')} aria-hidden />
          Yenile
        </button>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5">Kurye</th>
                <th className="px-4 py-2.5">Telefon</th>
                <th className="px-4 py-2.5">Tutar</th>
                <th className="px-4 py-2.5">Fatura</th>
                <th className="px-4 py-2.5">IBAN</th>
                <th className="px-4 py-2.5">Cüzdan</th>
                <th className="px-4 py-2.5">Durum</th>
                <th className="px-4 py-2.5">Talep</th>
                <th className="px-4 py-2.5">Not</th>
                <th className="px-4 py-2.5">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {listQ.isPending ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" aria-hidden />
                  </td>
                </tr>
              ) : listQ.data?.items?.length ? (
                listQ.data.items.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100/90 last:border-0 hover:bg-zinc-50/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/couriers/${row.courier.publicId}`} className="font-medium text-brand hover:underline">
                        {row.courier.displayName}
                      </Link>
                      <p className="text-xs text-zinc-500">{row.courier.publicId}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-600">{row.courier.phone}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums text-zinc-900">
                      {formatTry(row.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.invoice ? (
                        <button
                          type="button"
                          disabled={invoiceOpeningId === row.id}
                          onClick={() => {
                            setInvoiceOpeningId(row.id);
                            void openStaffPayoutInvoice(row.id)
                              .catch((e) => {
                                window.alert((e as Error).message || 'Fatura açılamadı');
                              })
                              .finally(() => setInvoiceOpeningId(null));
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          title={row.invoice.fileName}
                        >
                          {invoiceOpeningId === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          ) : (
                            <FileText className="h-3 w-3" aria-hidden />
                          )}
                          Görüntüle
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 font-mono text-xs text-zinc-700" title={row.iban ?? ''}>
                      {row.iban ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-600">
                      {row.courier.walletBalance != null ? formatTry(row.courier.walletBalance) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                          STATUS_STYLE[row.status] ?? 'bg-zinc-100 text-zinc-700',
                        )}
                      >
                        {STATUS_TR[row.status] ?? row.status}
                      </span>
                      {row.paidAt ? (
                        <p className="mt-1 text-[10px] text-zinc-500">Ödeme: {fmtShort(row.paidAt)}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">{fmtShort(row.createdAt)}</td>
                    <td className="max-w-[140px] truncate px-4 py-2.5 text-zinc-500" title={row.note ?? ''}>
                      {row.note ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              disabled={patchM.isPending}
                              onClick={() => void patchM.mutateAsync({ id: row.id, status: 'APPROVED' })}
                              className="rounded-md bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                            >
                              Onayla
                            </button>
                            <button
                              type="button"
                              disabled={patchM.isPending}
                              onClick={() => {
                                if (!window.confirm('Tutarı cüzdandan düşüp talebi «Ödendi» yapmak istiyor musunuz?')) return;
                                void patchM.mutateAsync({ id: row.id, status: 'PAID' });
                              }}
                              className="rounded-md bg-brand px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Ödendi
                            </button>
                            <button
                              type="button"
                              disabled={patchM.isPending}
                              onClick={() => {
                                if (!window.confirm('Talebi reddetmek istiyor musunuz?')) return;
                                void patchM.mutateAsync({ id: row.id, status: 'REJECTED' });
                              }}
                              className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Red
                            </button>
                          </>
                        ) : null}
                        {row.status === 'APPROVED' ? (
                          <>
                            <button
                              type="button"
                              disabled={patchM.isPending}
                              onClick={() => {
                                if (!window.confirm('Tutarı cüzdandan düşüp talebi «Ödendi» yapmak istiyor musunuz?')) return;
                                void patchM.mutateAsync({ id: row.id, status: 'PAID' });
                              }}
                              className="rounded-md bg-brand px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Ödendi
                            </button>
                            <button
                              type="button"
                              disabled={patchM.isPending}
                              onClick={() => {
                                if (!window.confirm('Onaylı talebi reddetmek istiyor musunuz?')) return;
                                void patchM.mutateAsync({ id: row.id, status: 'REJECTED' });
                              }}
                              className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Red
                            </button>
                          </>
                        ) : null}
                        {row.status === 'PAID' || row.status === 'REJECTED' ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-zinc-500">
                    Bu filtrede talep yok.
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
