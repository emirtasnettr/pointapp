'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Handshake, Loader2 } from 'lucide-react';
import {
  fetchPublicMarketingCampaign,
  formatCampaignDateRange,
  PHASE_LABEL,
} from '@/lib/marketing-campaigns';
import { cn } from '@/lib/cn';

export default function CampaignDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const { data: campaign, isPending, isError, error } = useQuery({
    queryKey: ['public', 'marketing-campaigns', slug],
    queryFn: () => fetchPublicMarketingCampaign(slug),
    enabled: slug.length > 0,
  });

  if (!slug) {
    return <p className="text-sm text-red-600">Geçersiz kampanya.</p>;
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="space-y-4">
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kampanyalar
        </Link>
        <p className="text-sm text-red-600">{(error as Error)?.message ?? 'Kampanya bulunamadı.'}</p>
      </div>
    );
  }

  const expired = campaign.phase === 'expired';

  return (
    <article className={cn('space-y-6', expired && 'opacity-95')}>
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-brand dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kampanyalar
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
            expired
              ? 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
              : campaign.phase === 'active'
                ? 'bg-brand text-white ring-brand/30'
                : 'bg-brand/10 text-brand ring-brand/20',
          )}
        >
          {PHASE_LABEL[campaign.phase]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          {formatCampaignDateRange(campaign.startsAt, campaign.endsAt)}
        </span>
      </div>

      {campaign.partnerLabel ? (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
          <Handshake className="h-4 w-4" aria-hidden />
          {campaign.partnerLabel}
        </p>
      ) : null}

      <h1
        className={cn(
          'text-3xl font-bold tracking-tight',
          expired ? 'text-zinc-700 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-50',
        )}
      >
        {campaign.title}
      </h1>
      <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">{campaign.summary}</p>

      <div
        className={cn(
          'prose prose-zinc max-w-none dark:prose-invert prose-headings:text-left prose-p:text-left prose-a:text-brand',
          expired && 'prose-zinc text-zinc-600',
        )}
        dangerouslySetInnerHTML={{
          __html: campaign.contentHtml?.trim() || '<p>İçerik henüz eklenmemiş.</p>',
        }}
      />
    </article>
  );
}
