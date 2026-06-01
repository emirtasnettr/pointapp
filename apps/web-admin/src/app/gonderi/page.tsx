import { Suspense } from 'react';
import { MarketingGuestDeliveryFlow } from '@/components/marketing/MarketingGuestDeliveryFlow';
import { MarketingSiteShell } from '@/components/marketing/MarketingSiteShell';
import { fetchPublicBrand } from '@/lib/brand-public';

export const metadata = {
  title: 'Gönderi oluştur',
  description: 'Üye olmadan teslimat oluşturun ve kart ile ödeyin.',
};

export default async function GonderiPage() {
  const brand = await fetchPublicBrand();
  const logoUrl = brand.logoLightUrl?.trim() || brand.logoDarkUrl?.trim() || null;

  return (
    <MarketingSiteShell logoUrl={logoUrl}>
      <main className="pt-[calc(6rem*1.15)] pb-20 sm:pb-24">
        <Suspense
          fallback={
            <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-zinc-500 sm:px-6">
              Yükleniyor…
            </div>
          }
        >
          <MarketingGuestDeliveryFlow />
        </Suspense>
      </main>
    </MarketingSiteShell>
  );
}
