import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MarketingQuickQuoteCard } from '@/components/marketing/MarketingQuickQuoteCard';
import { MarketingServiceHeroTitle } from '@/components/marketing/MarketingServiceHeroTitle';
import { MarketingServiceHighlights } from '@/components/marketing/MarketingServiceHighlights';
import { fetchPublicMarketingService } from '@/lib/marketing-services';

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const s = await fetchPublicMarketingService(slug);
    return { title: s.title, description: s.summary };
  } catch {
    return { title: 'Hizmet' };
  }
}

export default async function HizmetDetailPage({ params }: Props) {
  const { slug } = await params;

  let service: Awaited<ReturnType<typeof fetchPublicMarketingService>>;
  try {
    service = await fetchPublicMarketingService(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <section className="bg-[#13B34B] pt-[calc(6rem*1.15)]">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
          <Link
            href="/hizmetler"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Tüm hizmetler
          </Link>
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-2xl">
              <MarketingServiceHeroTitle title={service.heroTitle} accent={service.heroTitleAccent} />
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white">{service.heroDescription}</p>
              <MarketingServiceHighlights />
            </div>
            <MarketingQuickQuoteCard className="w-full max-w-md lg:max-w-none lg:justify-self-end" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <article
          className="prose prose-zinc prose-headings:text-left prose-p:text-left max-w-3xl text-left prose-a:text-brand"
          dangerouslySetInnerHTML={{
            __html: service.contentHtml?.trim() || '<p>İçerik henüz eklenmemiş.</p>',
          }}
        />
      </div>
    </>
  );
}
