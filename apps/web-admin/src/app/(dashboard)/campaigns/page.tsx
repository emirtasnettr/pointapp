'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/cn';

type CampaignListItem = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxUsesPerCustomer: number | null;
  createdAt: string;
  updatedAt: string;
  totalRedemptions: number;
  uniqueCustomerCount: number;
};

type ListResponse = { items: CampaignListItem[] };

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function CampaignsPage() {
  const q = useQuery({
    queryKey: ['staff', 'campaigns'],
    queryFn: () => apiGet<ListResponse>('/staff/campaigns'),
    retry: 1,
  });

  const rows = q.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Kampanyalar"
        description="Kodu müşteri teslimat oluştururken girer; kullanım teslimat kayıtlarından sayılır. Detayda düzenleme, kullanım listesi ve müşteri başına limit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/35 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/15"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden />
              Yeni kampanya
            </Link>
            <button
              type="button"
              onClick={() => void q.refetch()}
              disabled={q.isFetching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand/30 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-brand', q.isFetching && 'animate-spin')} aria-hidden />
              Yenile
            </button>
          </div>
        }
      />

      {q.isError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {(q.error as Error).message}
        </p>
      ) : null}

      <GlassCard>
        {q.isPending ? (
          <div className="flex justify-center py-16 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            Kayıtlı kampanya yok.{' '}
            <Link href="/campaigns/new" className="font-semibold text-brand hover:underline">
              Yeni kampanya oluştur
            </Link>
            {' '}
            veya <code className="font-mono text-[11px]">npx prisma db seed</code> ile demo kayıtlar yüklenebilir.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Kampanya</th>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3 text-right">Kullanım</th>
                  <th className="px-4 py-3 text-right">Müşteri</th>
                  <th className="px-4 py-3 text-center">Müşteri limiti</th>
                  <th className="px-4 py-3">Bitiş</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {rows.map((r) => (
                  <tr key={r.id} className={cn(!r.active && 'bg-amber-50/50')}>
                    <td className="px-4 py-3 font-medium text-zinc-900">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">{r.code ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{r.totalRedemptions}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{r.uniqueCustomerCount}</td>
                    <td className="px-4 py-3 text-center text-xs text-zinc-600">
                      {r.maxUsesPerCustomer == null ? '∞' : r.maxUsesPerCustomer}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{fmtDate(r.endsAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.active ? (
                        <span className="font-semibold text-brand">Aktif</span>
                      ) : (
                        <span className="font-semibold text-amber-800">Pasif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/campaigns/${encodeURIComponent(r.id)}`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </>
  );
}
