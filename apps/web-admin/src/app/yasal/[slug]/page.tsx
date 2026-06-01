import { notFound } from 'next/navigation';
import { isLegalPageSlug, legalPageTitle } from '@/lib/legal-pages';
import { MARKETING_FOOTER_LEGAL_LINKS } from '@/lib/marketing-footer-legal';
import { publicApiGet } from '@/lib/public-api';

type LegalPageResponse = {
  slug: string;
  title: string;
  html: string;
  updatedAt: string | null;
};

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return MARKETING_FOOTER_LEGAL_LINKS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const label = MARKETING_FOOTER_LEGAL_LINKS.find((l) => l.slug === slug)?.label;
  return { title: label ?? (isLegalPageSlug(slug) ? legalPageTitle(slug) : 'Yasal') };
}

export default async function MarketingLegalPage({ params }: Props) {
  const { slug } = await params;
  if (!isLegalPageSlug(slug)) notFound();

  let page: LegalPageResponse;
  try {
    page = await publicApiGet<LegalPageResponse>(`/public/legal/${encodeURIComponent(slug)}`);
  } catch {
    notFound();
  }

  const displayTitle =
    MARKETING_FOOTER_LEGAL_LINKS.find((l) => l.slug === slug)?.label ?? page.title;

  return (
    <>
      <h1 className="text-left text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        {displayTitle}
      </h1>
      {page.updatedAt ? (
        <p className="mt-2 text-left text-xs text-zinc-500">
          Son güncelleme: {new Date(page.updatedAt).toLocaleString('tr-TR')}
        </p>
      ) : null}
      <article
        className="prose prose-zinc prose-headings:text-left prose-p:text-left mt-8 max-w-none text-left prose-a:text-brand"
        dangerouslySetInnerHTML={{
          __html: page.html?.trim() || '<p>İçerik henüz eklenmemiş.</p>',
        }}
      />
    </>
  );
}
