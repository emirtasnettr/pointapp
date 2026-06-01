import { ArrowRight } from 'lucide-react';
import { fetchPublicBrand } from '@/lib/brand-public';
import { customerLoginPath } from '@/lib/marketing-links';
import { CustomerBenefitsSection } from './CustomerBenefitsSection';
import { CustomerShowcaseSection } from './CustomerShowcaseSection';
import { HowItWorksSection } from './HowItWorksSection';
import { HeroImageVisual } from './HeroImageVisual';
import { MarketingSiteShell } from './MarketingSiteShell';

export async function LandingPage() {
  const brand = await fetchPublicBrand();
  const logoUrl = brand.logoLightUrl?.trim() || brand.logoDarkUrl?.trim() || null;

  return (
    <MarketingSiteShell logoUrl={logoUrl}>
      <main>
        {/* Hero */}
        <section className="bg-[#13B34B] pt-[calc(4rem*1.15)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  Şehir içi anlık teslimat
                </p>
                <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                  Gönderileriniz{' '}
                  <span className="text-emerald-100">saatler içerisinde</span>, doğru kurye ile teslim
                  edilsin.
                </h1>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-white">
                  Point; evrak, paket ve acil gönderiler için kurumsal disiplinle çalışan, mobil öncelikli bir
                  teslimat ağıdır.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="/gonderi"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[20px] font-semibold text-[#13B34B] shadow-soft transition hover:bg-emerald-50 sm:text-sm"
                  >
                    Kurye Çağır
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                  <a
                    href={customerLoginPath()}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-6 py-3.5 text-[20px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm"
                  >
                    Müşteri Girişi
                  </a>
                </div>
              </div>

              <div className="mx-auto w-full max-w-lg lg:max-w-none">
                <HeroImageVisual hero={brand.heroImage} />
              </div>
            </div>
          </div>
        </section>

        <CustomerShowcaseSection
          showcase={brand.customerShowcase}
          appStoreUrl={brand.appStoreUrl}
          googlePlayUrl={brand.googlePlayUrl}
        />

        <HowItWorksSection />

        <CustomerBenefitsSection />
      </main>
    </MarketingSiteShell>
  );
}
