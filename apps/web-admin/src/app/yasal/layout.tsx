import { MarketingSiteShell } from '@/components/marketing/MarketingSiteShell';
import { fetchPublicBrand } from '@/lib/brand-public';

export default async function YasalLayout({ children }: { children: React.ReactNode }) {
  const brand = await fetchPublicBrand();
  const logoUrl = brand.logoLightUrl?.trim() || brand.logoDarkUrl?.trim() || null;

  return (
    <MarketingSiteShell logoUrl={logoUrl}>
      <main className="pt-[calc(6rem*1.15)] pb-20 sm:pb-28">
        <div className="mx-auto w-full max-w-6xl px-4 text-left sm:px-6">{children}</div>
      </main>
    </MarketingSiteShell>
  );
}
