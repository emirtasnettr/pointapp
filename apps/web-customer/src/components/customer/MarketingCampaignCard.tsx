'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Handshake, ImageIcon } from 'lucide-react';
import {
  formatCampaignDateRange,
  PHASE_LABEL,
  type PublicMarketingCampaign,
} from '@/lib/marketing-campaigns';
import { cn } from '@/lib/cn';

type Props = {
  campaign: PublicMarketingCampaign;
  compact?: boolean;
};

export function MarketingCampaignCard({ campaign, compact }: Props) {
  const expired = campaign.phase === 'expired';
  const href = `/campaigns/${encodeURIComponent(campaign.slug)}`;

  return (
    <Link
      href={href}
      className={cn(
        'group flex h-full flex-col overflow-hidden border shadow-soft transition duration-300',
        compact ? 'rounded-2xl' : 'rounded-3xl',
        expired
          ? 'border-zinc-200/90 bg-zinc-100/80 grayscale hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/50'
          : 'border-zinc-200/90 bg-gradient-to-br from-white to-zinc-50/90 hover:border-brand/25 hover:shadow-[0_12px_40px_-12px_rgba(22,178,75,0.12)] dark:border-white/10 dark:from-zinc-900 dark:to-zinc-900/80',
      )}
    >
      <div
        className={cn(
          'relative aspect-[16/9] overflow-hidden',
          expired ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-gradient-to-br from-brand/10 to-emerald-50 dark:from-brand/20 dark:to-zinc-900',
        )}
      >
        {campaign.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.imageUrl}
            alt=""
            className={cn('h-full w-full object-cover transition', expired && 'opacity-70')}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl',
                expired ? 'bg-zinc-300/50 text-zinc-500' : 'bg-brand/10 text-brand',
              )}
            >
              <ImageIcon className="h-7 w-7" aria-hidden />
            </span>
          </div>
        )}
        <span
          className={cn(
            'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
            expired
              ? 'bg-zinc-200/90 text-zinc-600 ring-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-400'
              : campaign.phase === 'active'
                ? 'bg-brand text-white ring-brand/30'
                : 'bg-white/95 text-brand ring-brand/20 dark:bg-zinc-900/90',
          )}
        >
          {PHASE_LABEL[campaign.phase]}
        </span>
      </div>

      <div className={cn('flex flex-1 flex-col', compact ? 'p-3.5' : 'p-5 sm:p-6')}>
        {campaign.partnerLabel ? (
          <p
            className={cn(
              'mb-2 inline-flex items-center gap-1.5 text-xs font-semibold',
              expired ? 'text-zinc-500' : 'text-brand',
            )}
          >
            <Handshake className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {campaign.partnerLabel}
          </p>
        ) : null}
        <h2
          className={cn(
            'font-bold tracking-tight',
            compact ? 'text-sm leading-snug' : 'text-lg sm:text-xl',
            expired ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 group-hover:text-brand dark:text-zinc-50',
          )}
        >
          {campaign.title}
        </h2>
        <p
          className={cn(
            'mt-1.5 flex-1 leading-relaxed',
            compact ? 'line-clamp-2 text-xs' : 'mt-2 text-sm',
            expired ? 'text-zinc-500' : 'text-zinc-600 dark:text-zinc-400',
          )}
        >
          {campaign.summary}
        </p>
        <p className={cn('inline-flex items-center gap-1.5 text-zinc-500', compact ? 'mt-2 text-[10px]' : 'mt-4 text-xs')}>
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatCampaignDateRange(campaign.startsAt, campaign.endsAt)}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold',
            compact ? 'mt-2 text-xs' : 'mt-4 text-sm',
            expired ? 'text-zinc-500' : 'text-brand',
          )}
        >
          Detayları gör
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
