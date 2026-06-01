import { MarketingSiteShell } from '@/components/marketing/MarketingSiteShell';
import { fetchPublicBrand } from '@/lib/brand-public';

export default async function HizmetlerLayout({ children }: { children: React.ReactNode }) {
  const brand = await fetchPublicBrand();
  const logoUrl = brand.logoLightUrl?.trim() || brand.logoDarkUrl?.trim() || null;

  return (
    <MarketingSiteShell logoUrl={logoUrl}>
      <main className="pb-20 sm:pb-28">{children}</main>
    </MarketingSiteShell>
  );
}
