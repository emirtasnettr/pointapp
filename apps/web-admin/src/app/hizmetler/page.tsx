import { MarketingServiceCard } from '@/components/marketing/MarketingServiceCard';
import { fetchPublicMarketingServices } from '@/lib/marketing-services';

export const metadata = {
  title: 'Hizmetler',
  description: 'Point teslimat hizmetleri.',
};

export const dynamic = 'force-dynamic';

export default async function HizmetlerPage() {
  let items: Awaited<ReturnType<typeof fetchPublicMarketingServices>>['items'] = [];
  try {
    const data = await fetchPublicMarketingServices();
    items = data.items;
  } catch {
    items = [];
  }

  return (
    <div className="pt-[calc(6rem*1.15)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Hizmetler
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Hizmetlerimiz</h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            Şehir içi teslimat ihtiyaçlarınıza uygun çözümlerimizi keşfedin.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
            <p className="text-sm font-medium text-zinc-600">Şu an yayında hizmet bulunmuyor.</p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {items.map((s) => (
              <li key={s.slug} className="min-h-0">
                <MarketingServiceCard service={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
