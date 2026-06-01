import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Handshake } from 'lucide-react';
import {
  fetchPublicMarketingCampaign,
  formatCampaignDateRange,
  PHASE_LABEL,
} from '@/lib/marketing-campaigns';
import { cn } from '@/lib/cn';

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const c = await fetchPublicMarketingCampaign(slug);
    return { title: c.title, description: c.summary };
  } catch {
    return { title: 'Kampanya' };
  }
}

export default async function KampanyaDetailPage({ params }: Props) {
  const { slug } = await params;

  let campaign: Awaited<ReturnType<typeof fetchPublicMarketingCampaign>>;
  try {
    campaign = await fetchPublicMarketingCampaign(slug);
  } catch {
    notFound();
  }

  const expired = campaign.phase === 'expired';

  return (
    <article className={cn(expired && 'opacity-95')}>
      <Link
        href="/kampanyalar"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Tüm kampanyalar
      </Link>

      <div className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
              expired
                ? 'bg-zinc-100 text-zinc-600 ring-zinc-200'
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
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
            <Handshake className="h-4 w-4" aria-hidden />
            {campaign.partnerLabel}
          </p>
        ) : null}

        <h1
          className={cn(
            'mt-3 text-3xl font-bold tracking-tight sm:text-4xl',
            expired ? 'text-zinc-700' : 'text-zinc-900',
          )}
        >
          {campaign.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">{campaign.summary}</p>

        <div
          className={cn(
            'prose prose-zinc prose-headings:text-left prose-p:text-left mt-10 max-w-none text-left prose-a:text-brand',
            expired && 'prose-zinc text-zinc-600',
          )}
          dangerouslySetInnerHTML={{
            __html: campaign.contentHtml?.trim() || '<p>İçerik henüz eklenmemiş.</p>',
          }}
        />
      </div>
    </article>
  );
}
