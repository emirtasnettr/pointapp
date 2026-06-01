import { MarketingShipmentTrack } from '@/components/marketing/MarketingShipmentTrack';
import { MarketingSiteShell } from '@/components/marketing/MarketingSiteShell';
import { fetchPublicBrand } from '@/lib/brand-public';

export const metadata = {
  title: 'Gönderi takibi',
  description: 'Telefon numaranız ile son gönderilerinizi sorgulayın.',
};

export default async function GonderiTakibiPage() {
  const brand = await fetchPublicBrand();
  const logoUrl = brand.logoLightUrl?.trim() || brand.logoDarkUrl?.trim() || null;

  return (
    <MarketingSiteShell logoUrl={logoUrl}>
      <main className="pt-[calc(4rem*1.15)] pb-20 sm:pb-28">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <MarketingShipmentTrack />
        </div>
      </main>
    </MarketingSiteShell>
  );
}
