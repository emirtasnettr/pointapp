import { MarketingCampaignCard } from '@/components/marketing/MarketingCampaignCard';
import { fetchPublicMarketingCampaigns } from '@/lib/marketing-campaigns';

export const metadata = {
  title: 'Kampanyalar',
  description: 'Point kampanyaları ve iş ortaklığı fırsatları.',
};

export const dynamic = 'force-dynamic';

export default async function KampanyalarPage() {
  let items: Awaited<ReturnType<typeof fetchPublicMarketingCampaigns>>['items'] = [];
  try {
    const data = await fetchPublicMarketingCampaigns();
    items = data.items;
  } catch {
    items = [];
  }

  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Güncel fırsatlar ve iş birlikleri
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600">
          Point kampanyalarını ve iş ortaklarımızla sunduğumuz avantajları keşfedin.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <p className="text-sm font-medium text-zinc-600">Şu an yayında kampanya bulunmuyor.</p>
          <p className="mt-1 text-xs text-zinc-500">Yeni kampanyalar için kısa süre sonra tekrar bakın.</p>
        </div>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <li key={c.slug} className="min-h-0">
              <MarketingCampaignCard campaign={c} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
