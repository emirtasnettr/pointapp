'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ListOrdered, PlusCircle } from 'lucide-react';
import { GlassCard } from '@/components/customer/GlassCard';
import { apiGetAuth } from '@/lib/api';
import { deliveryRouteSummary } from '@/lib/address-route';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { addCalendarDaysIstanbul, formatYmdIstanbul } from '@/lib/istanbul-calendar';

type ListResponse = {
  items: Array<{
    id: string;
    orderNumber: number;
    status: string;
    pickupAddress: { label?: string; line1?: string; city?: string };
    dropoffAddress: { label?: string; line1?: string; city?: string };
  }>;
};

export default function PanelPage() {
  const range = (() => {
    const to = formatYmdIstanbul();
    return { from: addCalendarDaysIstanbul(to, -89), to };
  })();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['customer', 'deliveries', 'panel', range.from, range.to],
    queryFn: () => {
      const qs = new URLSearchParams({
        take: '50',
        fromDate: range.from,
        toDate: range.to,
      });
      return apiGetAuth<ListResponse>(`/customer/deliveries?${qs.toString()}`);
    },
  });

  const list = data?.items ?? [];
  const activeItems = list.filter((x) => !['DELIVERED', 'CANCELLED'].includes(x.status));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Merhaba</h1>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">Teslimatlarını buradan yönet.</p>
      </div>
      {isError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {(error as Error).message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/delivery/new">
          <GlassCard className="h-full transition hover:border-brand/40 hover:shadow-soft">
            <PlusCircle className="h-8 w-8 text-brand" aria-hidden />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand">Hızlı işlem</p>
            <p className="mt-2 text-lg font-semibold">Yeni teslimat</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Alış / teslim adresi ve araç tipi</p>
          </GlassCard>
        </Link>
        <Link href="/orders">
          <GlassCard className="h-full transition hover:border-brand/40 hover:shadow-soft">
            <ListOrdered className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Geçmiş</p>
            <p className="mt-2 text-lg font-semibold">Siparişlerim</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Durum ve takip</p>
          </GlassCard>
        </Link>
      </div>
      <GlassCard>
        <h2 className="text-sm font-semibold">Aktif teslimat</h2>
        {isPending ? (
          <p className="mt-4 text-sm text-zinc-500">Yükleniyor…</p>
        ) : activeItems.length > 0 ? (
          <div className="mt-4 space-y-2">
            {activeItems.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={`/orders/${item.orderNumber}`}
                className="block rounded-2xl border border-brand/25 bg-brand/5 p-4 transition hover:border-brand/50"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">#{item.orderNumber}</p>
                <p className="mt-1 font-medium text-brand">{deliveryStatusLabel(item.status)}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {deliveryRouteSummary(item.pickupAddress, item.dropoffAddress)}
                </p>
              </Link>
            ))}
            {activeItems.length > 3 ? (
              <Link href="/orders" className="text-sm font-semibold text-brand hover:underline">
                Tüm aktif siparişler ({activeItems.length})
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Şu an devam eden teslimat yok.</p>
        )}
      </GlassCard>
    </div>
  );
}
