'use client';

import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CalendarClock,
  ChevronRight,
  FileText,
  Hash,
  Inbox,
  RefreshCw,
  Truck,
  Upload,
  UserRound,
} from 'lucide-react';
import { DeliveryCustomerInvoiceUploadModal } from '@/components/admin/DeliveryCustomerInvoiceUploadModal';
import { PageHeader } from '@/components/admin/PageHeader';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTry } from '@/lib/format';

type ListResponse = {
  items: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalPrice: string;
    createdAt: string;
    updatedAt: string;
    customer: { publicId: string; displayName: string };
    courier: { publicId: string; displayName: string } | null;
    customerInvoiceCount: number;
  }>;
  total: number;
  skip: number;
  take: number;
};

export default function CompletedDeliveriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [singleUpload, setSingleUpload] = useState<{ id: string; orderNumber: number } | null>(null);

  const listQuery = useInfiniteQuery({
    queryKey: ['deliveries', 'admin-completed'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiGet<ListResponse>(`/deliveries?status=DELIVERED&take=100&skip=${pageParam as number}`),
    getNextPageParam: (last) => (last.skip + last.take < last.total ? last.skip + last.take : undefined),
  });

  const rows = listQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const total = listQuery.data?.pages[0]?.total ?? 0;
  const isFetching = listQuery.isFetching;
  const isPending = listQuery.isPending;

  const selectedIds = Object.keys(selected);
  const selectedOrderNumbers = selectedIds.map((id) => selected[id]!);

  const selectedCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      if (selected[row.id]) ids.add(row.customer.publicId);
    }
    return ids;
  }, [rows, selected]);

  const bulkCustomerMismatch = selectedCustomerIds.size > 1;

  function toggleRow(id: string, orderNumber: number, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[id] = orderNumber;
      else delete next[id];
      return next;
    });
  }

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: ['deliveries', 'admin-completed'] });
    void listQuery.refetch();
  }

  return (
    <>
      <PageHeader
        title="Tamamlanan Teslimatlar"
        description="Teslim edilmiş siparişlere fatura yükleyin; müşteri panelinde görünür. Birden fazla sipariş seçerek toplu fatura da yükleyebilirsiniz."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                disabled={bulkCustomerMismatch}
                title={
                  bulkCustomerMismatch
                    ? 'Toplu fatura için tüm siparişler aynı müşteriye ait olmalıdır'
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Toplu fatura ({selectedIds.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void listQuery.refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-soft backdrop-blur-sm transition hover:border-brand/35 hover:bg-brand/[0.06] hover:text-zinc-900 disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-brand', isFetching && 'animate-spin')} />
              Yenile
            </button>
          </div>
        }
      />

      {bulkCustomerMismatch ? (
        <p className="mb-4 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-xs text-amber-900">
          Seçili siparişler farklı müşterilere ait. Toplu fatura yüklemek için yalnızca aynı müşterinin siparişlerini
          seçin.
        </p>
      ) : null}

      <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/60 px-3 py-2 text-xs text-zinc-500 backdrop-blur-md">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        <span>
          Toplam <span className="font-medium text-zinc-700">{isPending ? '…' : total}</span> teslim edilmiş kayıt
          {rows.length > 0 && rows.length < total ? (
            <>
              {' '}
              · Gösterilen: <span className="font-medium text-zinc-700">{rows.length}</span>
            </>
          ) : null}
        </span>
      </div>

      {listQuery.isError ? (
        <p className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-soft backdrop-blur-sm">
          <span>{(listQuery.error as Error).message}</span>
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white/85 shadow-[0_6px_28px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl">
        <div className="max-h-[min(60vh,520px)] overflow-x-auto overflow-y-auto overscroll-contain">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-zinc-200/90 bg-zinc-50/95 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur-md">
              <tr>
                <th className="w-10 px-2 py-2 pl-3 sm:pl-4">
                  <span className="sr-only">Seç</span>
                </th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3 w-3 text-zinc-400" aria-hidden />
                    Sipariş
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-3 w-3 text-zinc-400" aria-hidden />
                    Müşteri
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3 w-3 text-zinc-400" aria-hidden />
                    Kurye
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <Banknote className="h-3 w-3 text-zinc-400" aria-hidden />
                    Tutar
                  </span>
                </th>
                <th className="px-3 py-2">Fatura</th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3 text-zinc-400" aria-hidden />
                    Oluşturulma
                  </span>
                </th>
                <th className="px-3 py-2">Son güncelleme</th>
                <th className="w-20 px-2 py-2 pr-3 sm:pr-4" aria-hidden>
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80 text-zinc-800">
              {isPending ? (
                <tr>
                  <td className="px-4 py-8 sm:px-5" colSpan={9}>
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <RefreshCw className="h-6 w-6 animate-spin text-brand/70" aria-hidden />
                      <span className="text-xs font-medium">Yükleniyor…</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((d) => {
                  const href = `/orders/${d.orderNumber}`;
                  const isSelected = Boolean(selected[d.id]);
                  return (
                    <tr
                      key={d.id}
                      className={cn(
                        'transition-colors',
                        isSelected ? 'bg-brand/[0.06]' : 'hover:bg-brand/[0.03]',
                      )}
                    >
                      <td className="px-2 py-1.5 pl-3 sm:pl-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleRow(d.id, d.orderNumber, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Sipariş ${d.orderNumber} seç`}
                          className="h-3.5 w-3.5 rounded border-zinc-300 text-brand focus:ring-brand/30"
                        />
                      </td>
                      <td
                        className="max-w-[7rem] cursor-pointer px-3 py-1.5"
                        onClick={() => router.push(href)}
                      >
                        <span className="inline-flex font-mono text-[11px] font-semibold tabular-nums text-brand">
                          <span className="rounded-md bg-brand/10 px-1.5 py-0.5 ring-1 ring-brand/12">
                            #{d.orderNumber}
                          </span>
                        </span>
                      </td>
                      <td
                        className="max-w-[10rem] cursor-pointer px-3 py-1.5"
                        onClick={() => router.push(href)}
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-zinc-700">
                          <UserRound className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden />
                          <span className="truncate font-medium text-zinc-800">{d.customer.displayName}</span>
                        </span>
                      </td>
                      <td
                        className="max-w-[9rem] cursor-pointer px-3 py-1.5"
                        onClick={() => router.push(href)}
                      >
                        {d.courier ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-zinc-700">
                            <Truck className="h-3 w-3 shrink-0 text-brand/70" aria-hidden />
                            <span className="truncate font-medium text-zinc-800">{d.courier.displayName}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td
                        className="cursor-pointer whitespace-nowrap px-3 py-1.5"
                        onClick={() => router.push(href)}
                      >
                        <span className="inline-flex items-center gap-1 font-medium tabular-nums text-zinc-900">
                          <Banknote className="h-3 w-3 text-zinc-400" aria-hidden />
                          {formatTry(d.totalPrice)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        {d.customerInvoiceCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 ring-1 ring-emerald-200/80">
                            <FileText className="h-3 w-3" aria-hidden />
                            {d.customerInvoiceCount}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Yok</span>
                        )}
                      </td>
                      <td
                        className="cursor-pointer whitespace-nowrap px-3 py-1.5 tabular-nums text-[11px] text-zinc-500"
                        onClick={() => router.push(href)}
                      >
                        {new Date(d.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td
                        className="cursor-pointer whitespace-nowrap px-3 py-1.5 tabular-nums text-[11px] text-zinc-500"
                        onClick={() => router.push(href)}
                      >
                        {new Date(d.updatedAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-2 py-1.5 pr-3 sm:pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Fatura yükle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSingleUpload({ id: d.id, orderNumber: d.orderNumber });
                            }}
                            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-brand/10 hover:text-brand"
                          >
                            <Upload className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            title="Detay"
                            onClick={() => router.push(href)}
                            className="rounded-lg p-1.5 text-zinc-300 transition hover:text-zinc-600"
                          >
                            <ChevronRight className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-10 sm:px-6" colSpan={9}>
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-zinc-500">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80">
                        <Inbox className="h-5 w-5 text-zinc-400" aria-hidden />
                      </div>
                      <p className="text-xs font-medium text-zinc-700">Henüz teslim edilmiş kayıt yok</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {listQuery.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void listQuery.fetchNextPage()}
            disabled={listQuery.isFetchingNextPage}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-800 shadow-soft transition hover:border-brand/30 disabled:opacity-50"
          >
            {listQuery.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla göster'}
          </button>
        </div>
      ) : null}

      {uploadOpen && selectedIds.length > 0 ? (
        <DeliveryCustomerInvoiceUploadModal
          deliveryIds={selectedIds}
          orderNumbers={selectedOrderNumbers}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setSelected({});
            invalidateList();
          }}
        />
      ) : null}

      {singleUpload ? (
        <DeliveryCustomerInvoiceUploadModal
          deliveryIds={[singleUpload.id]}
          orderNumbers={[singleUpload.orderNumber]}
          onClose={() => setSingleUpload(null)}
          onUploaded={() => {
            setSingleUpload(null);
            invalidateList();
          }}
        />
      ) : null}
    </>
  );
}
