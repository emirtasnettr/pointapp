'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { DeliveryInvoiceBadge } from '@/lib/delivery-invoice-badge';
import { apiGetAuth, openCustomerDeliveryInvoice } from '@/lib/api';
import { formatTry } from '@/lib/format';
import { addCalendarDaysIstanbul, formatYmdIstanbul } from '@/lib/istanbul-calendar';

type OverviewResponse = {
  pending: Array<{
    deliveryId: string;
    orderNumber: number;
    totalPrice: string;
    deliveredAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    fileName: string;
    createdAt: string;
    orderNumbers: number[];
    deliveryCount: number;
  }>;
  total: number;
  skip: number;
  take: number;
};

const PAGE_SIZE = 10;

const dateInputClass =
  'h-9 min-w-[10.5rem] rounded-lg border border-zinc-200/90 bg-white px-2.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';

const tableWrap =
  'overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900/50';

const tableClass = 'w-full min-w-[720px] text-left text-sm';

const theadClass =
  'border-b border-zinc-100 bg-zinc-50/90 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/5';

function defaultRange() {
  const to = formatYmdIstanbul();
  return { from: addCalendarDaysIstanbul(to, -89), to };
}

function formatOrders(orderNumbers: number[]) {
  if (orderNumbers.length === 0) return '—';
  if (orderNumbers.length === 1) return `#${orderNumbers[0]}`;
  return orderNumbers.map((n) => `#${n}`).join(', ');
}

function InvoicePagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 shadow-soft sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-zinc-900/50"
      aria-label="Fatura listesi sayfalandırma"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Toplam <span className="font-medium text-zinc-900 dark:text-zinc-100">{total}</span> kayıt ·{' '}
        <span className="tabular-nums">
          {from}–{to}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Önceki
        </button>
        <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Sonraki
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

export default function InvoicesPage() {
  const [{ from, to }, setRange] = useState(defaultRange);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const applyRange = useCallback(() => {
    setPage(1);
    setRange({ from: draftFrom, to: draftTo });
  }, [draftFrom, draftTo]);

  const resetRange = useCallback(() => {
    const next = defaultRange();
    setDraftFrom(next.from);
    setDraftTo(next.to);
    setPage(1);
    setRange(next);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [from, to]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['customer', 'invoices', from, to, page],
    queryFn: () => {
      const skip = String((page - 1) * PAGE_SIZE);
      const qs = new URLSearchParams({
        fromDate: from,
        toDate: to,
        take: String(PAGE_SIZE),
        skip,
      });
      return apiGetAuth<OverviewResponse>(`/customer/invoices?${qs.toString()}`);
    },
  });

  const openInvoice = useCallback(async (id: string) => {
    setOpeningId(id);
    try {
      await openCustomerDeliveryInvoice(id);
    } finally {
      setOpeningId(null);
    }
  }, []);

  const pending = data?.pending ?? [];
  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const empty = !isPending && total === 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Faturalarım</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Teslim edilmiş siparişleriniz için yüklenen faturalar ve hazırlanmakta olanlar.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 shadow-soft dark:border-white/10 dark:bg-zinc-900/50">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tarih aralığı</p>
            <p className="mt-0.5 text-xs text-zinc-500">Teslim tarihine göre faturalar listelenir.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div
              className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-2 sm:flex-row sm:items-center sm:gap-1 dark:border-white/10 dark:bg-white/5"
              role="group"
              aria-label="Tarih aralığı seçimi"
            >
              <label className="flex items-center gap-2 px-1">
                <span className="w-14 shrink-0 text-xs font-medium text-zinc-500">Başlangıç</span>
                <input
                  type="date"
                  value={draftFrom}
                  max={draftTo}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className={dateInputClass}
                />
              </label>
              <span className="hidden px-1 text-zinc-300 sm:inline" aria-hidden>
                —
              </span>
              <label className="flex items-center gap-2 px-1">
                <span className="w-14 shrink-0 text-xs font-medium text-zinc-500">Bitiş</span>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className={dateInputClass}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyRange}
                className="h-9 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90"
              >
                Uygula
              </button>
              <button
                type="button"
                onClick={resetRange}
                className="h-9 shrink-0 rounded-xl border border-zinc-200/90 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
              >
                Son 90 gün
              </button>
            </div>
          </div>
        </div>
      </div>

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {(error as Error).message}
        </p>
      ) : null}

      {isPending ? (
        <div className="flex justify-center rounded-xl border border-zinc-200/80 bg-white py-8 dark:border-white/10 dark:bg-zinc-900/50">
          <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
        </div>
      ) : null}

      {!isPending && pending.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Fatura hazırlanıyor</h2>
          <div className={tableWrap}>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className="px-3 py-2.5">Sipariş</th>
                  <th className="px-3 py-2.5">Tutar</th>
                  <th className="px-3 py-2.5">Teslim tarihi</th>
                  <th className="px-3 py-2.5">Durum</th>
                  <th className="px-3 py-2.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
                {pending.map((row) => (
                  <tr key={row.deliveryId} className="hover:bg-brand/[0.03]">
                    <td className="px-3 py-2.5 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      #{row.orderNumber}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatTry(row.totalPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {new Date(row.deliveredAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-3 py-2.5">
                      <DeliveryInvoiceBadge status="DELIVERED" customerInvoiceCount={0} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/orders/${row.orderNumber}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:border-brand/30 dark:border-zinc-600"
                      >
                        Sipariş
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!isPending && invoices.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Yüklenen faturalar</h2>
          <div className={tableWrap}>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className="px-3 py-2.5">Fatura</th>
                  <th className="px-3 py-2.5">Siparişler</th>
                  <th className="px-3 py-2.5">Yükleme tarihi</th>
                  <th className="px-3 py-2.5">Durum</th>
                  <th className="px-3 py-2.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-brand/[0.03]">
                    <td className="max-w-[200px] truncate px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {inv.invoiceNumber || inv.fileName}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {formatOrders(inv.orderNumbers)}
                      {inv.deliveryCount > 1 ? (
                        <span className="mt-0.5 block text-[11px] text-zinc-500">
                          {inv.deliveryCount} sipariş birleşik
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {new Date(inv.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-3 py-2.5">
                      <DeliveryInvoiceBadge status="DELIVERED" customerInvoiceCount={1} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={openingId === inv.id}
                        onClick={() => void openInvoice(inv.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:border-brand/30 disabled:opacity-60 dark:border-zinc-600"
                      >
                        {openingId === inv.id ? 'Açılıyor…' : 'Görüntüle'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!isPending && total > 0 ? (
        <InvoicePagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}

      {empty ? (
        <p className="rounded-xl border border-zinc-200/80 bg-white px-4 py-6 text-center text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-400">
          Bu tarih aralığında teslim edilmiş sipariş veya yüklenmiş fatura bulunmuyor.
        </p>
      ) : null}
    </div>
  );
}
