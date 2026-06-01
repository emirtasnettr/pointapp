'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, Megaphone } from 'lucide-react';
import { GlassCard } from '@/components/customer/GlassCard';
import { MarketingCampaignCard } from '@/components/customer/MarketingCampaignCard';
import { fetchPublicMarketingCampaigns } from '@/lib/marketing-campaigns';

const PAGE_SIZE = 12;

function CampaignsPagination({
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
      aria-label="Kampanya listesi sayfalandırma"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Toplam <span className="font-medium text-zinc-900 dark:text-zinc-100">{total}</span> kampanya ·{' '}
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

export default function CampaignsPage() {
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['public', 'marketing-campaigns', page],
    queryFn: () =>
      fetchPublicMarketingCampaigns({
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Kampanyalar</h1>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          Size özel indirimler, iş ortaklıkları ve duyurular.
        </p>
      </div>

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {(error as Error).message}
        </p>
      ) : null}

      {isPending ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-brand" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 py-10 text-center">
          <Megaphone className="h-9 w-9 text-zinc-400" aria-hidden />
          <p className="font-medium text-zinc-800 dark:text-zinc-200">Henüz kampanya yok</p>
          <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
            Yeni kampanyalar yayınlandığında burada görünecek.
          </p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((c) => (
              <MarketingCampaignCard key={c.slug} campaign={c} compact />
            ))}
          </div>
          <CampaignsPagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
