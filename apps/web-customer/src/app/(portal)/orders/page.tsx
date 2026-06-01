'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { apiGetAuth } from '@/lib/api';
import { deliveryRouteSummary } from '@/lib/address-route';
import { DeliveryInvoiceBadge } from '@/lib/delivery-invoice-badge';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { formatTry } from '@/lib/format';
import { addCalendarDaysIstanbul, formatYmdIstanbul } from '@/lib/istanbul-calendar';
import { cn } from '@/lib/cn';

type ListResponse = {
  items: Array<{
    id: string;
    orderNumber: number;
    status: string;
    customerInvoiceCount?: number;
    totalPrice: string;
    createdAt: string;
    pickupAddress: { label?: string; line1?: string; city?: string };
    dropoffAddress: { label?: string; line1?: string; city?: string };
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

const tableClass = 'w-full min-w-[800px] text-left text-sm';

const theadClass =
  'border-b border-zinc-100 bg-zinc-50/90 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/5';

function defaultRange() {
  const to = formatYmdIstanbul();
  return { from: addCalendarDaysIstanbul(to, -89), to };
}

function isActiveStatus(status: string) {
  return !['DELIVERED', 'CANCELLED'].includes(status);
}

function StatusBadge({ status }: { status: string }) {
  const active = isActiveStatus(status);
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        active
          ? 'bg-brand/10 text-brand'
          : status === 'CANCELLED'
            ? 'bg-red-500/10 text-red-700 dark:text-red-300'
            : 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
      )}
    >
      {deliveryStatusLabel(status)}
    </span>
  );
}

function OrdersPagination({
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
      className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-zinc-900/50"
      aria-label="Sipariş listesi sayfalandırma"
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

function OrdersTable({
  rows,
  highlightActive,
}: {
  rows: ListResponse['items'];
  highlightActive?: boolean;
}) {
  return (
    <div className={tableWrap}>
      <table className={tableClass}>
        <thead className={theadClass}>
          <tr>
            <th className="px-3 py-2.5">Sipariş</th>
            <th className="px-3 py-2.5">Güzergâh</th>
            <th className="px-3 py-2.5">Oluşturma</th>
            <th className="px-3 py-2.5">Tutar</th>
            <th className="px-3 py-2.5">Durum</th>
            <th className="px-3 py-2.5 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
          {rows.map((o) => {
            const route = deliveryRouteSummary(o.pickupAddress, o.dropoffAddress);
            const active = highlightActive ?? isActiveStatus(o.status);
            return (
              <tr
                key={o.id}
                className={cn('hover:bg-brand/[0.03]', active && 'bg-brand/[0.02]')}
              >
                <td className="px-3 py-2.5 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  #{o.orderNumber}
                </td>
                <td className="max-w-[220px] px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                  <span className="line-clamp-2" title={route}>
                    {route}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                  {new Date(o.createdAt).toLocaleString('tr-TR')}
                </td>
                <td className="px-3 py-2.5 tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                  {formatTry(o.totalPrice)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col items-start gap-1.5">
                    <StatusBadge status={o.status} />
                    {o.status === 'DELIVERED' ? (
                      <DeliveryInvoiceBadge
                        status={o.status}
                        customerInvoiceCount={o.customerInvoiceCount}
                      />
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    href={`/orders/${o.orderNumber}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:border-brand/30 dark:border-zinc-600"
                  >
                    Detay
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OrdersPage() {
  const [{ from, to }, setRange] = useState(defaultRange);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
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
    queryKey: ['customer', 'deliveries', 'orders', from, to, page],
    queryFn: () => {
      const skip = String((page - 1) * PAGE_SIZE);
      const qs = new URLSearchParams({
        fromDate: from,
        toDate: to,
        take: String(PAGE_SIZE),
        skip,
      });
      return apiGetAuth<ListResponse>(`/customer/deliveries?${qs.toString()}`);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const activeOnPage = useMemo(() => items.filter((o) => isActiveStatus(o.status)), [items]);
  const otherOnPage = useMemo(() => items.filter((o) => !isActiveStatus(o.status)), [items]);

  const showActiveSection = !isPending && activeOnPage.length > 0;
  const showOtherSection = !isPending && otherOnPage.length > 0;
  const empty = !isPending && total === 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Siparişlerim</h1>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          Tüm teslimat siparişlerinizi tarih aralığına göre listeleyin ve detayına gidin.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-soft dark:border-white/10 dark:bg-zinc-900/50">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tarih aralığı</p>
            <p className="mt-0.5 text-xs text-zinc-500">Sipariş oluşturma tarihine göre listelenir.</p>
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

      {showActiveSection ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Aktif siparişler</h2>
          <OrdersTable rows={activeOnPage} highlightActive />
        </section>
      ) : null}

      {showOtherSection ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {showActiveSection ? 'Diğer siparişler' : 'Siparişler'}
          </h2>
          <OrdersTable rows={otherOnPage} />
        </section>
      ) : null}

      {!isPending && total > 0 ? (
        <OrdersPagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      ) : null}

      {empty ? (
        <p className="rounded-xl border border-zinc-200/80 bg-white px-4 py-6 text-center text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-400">
          Bu tarih aralığında sipariş bulunmuyor.
        </p>
      ) : null}
    </div>
  );
}
