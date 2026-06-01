import { ImageIcon } from 'lucide-react';
import type { PublicBrandImage } from '@/lib/brand-public';
import { AppStoreBadges } from './AppStoreBadges';

type Props = {
  showcase: PublicBrandImage;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
};

export function CustomerShowcaseSection({ showcase, appStoreUrl, googlePlayUrl }: Props) {
  const url = showcase.url?.trim() || null;
  const w = showcase.width;
  const h = showcase.height;
  const aspectRatio = w && h ? `${w} / ${h}` : '4 / 5';

  return (
    <section id="musteri" className="scroll-mt-[calc(6rem*1.15)] bg-white pb-20 pt-16 sm:pb-28 sm:pt-20 lg:pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-4xl font-bold leading-[1.15] tracking-tight text-zinc-900 sm:text-5xl lg:text-[3.25rem]">
              Tüm gönderileriniz için{' '}
              <span className="text-brand">hızlı ve güvenilir</span> teslimat sizi bekliyor.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600">
              Bireysel veya kurumsal hesap açın; tek tıkla teslimat oluşturun, geçmiş siparişleri ve
              ödemeleri panelden izleyin.
            </p>

            <AppStoreBadges
              appStoreUrl={appStoreUrl}
              googlePlayUrl={googlePlayUrl}
              className="mt-8 flex flex-wrap items-center gap-3"
            />
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div
              className="pointer-events-none absolute -right-4 top-8 h-48 w-48 rounded-full bg-brand/8 blur-2xl lg:h-64 lg:w-64"
              aria-hidden
            />
            <div className="relative w-full max-w-md">
              <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-zinc-50 shadow-soft">
                {url ? (
                  <div className="relative w-full" style={{ aspectRatio }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      width={w ?? undefined}
                      height={h ?? undefined}
                    />
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
                    style={{ aspectRatio }}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                      <ImageIcon className="h-7 w-7" aria-hidden />
                    </span>
                    <p className="text-sm font-medium text-zinc-600">Tanıtım görseli henüz yüklenmedi</p>
                    <p className="max-w-xs text-xs text-zinc-500">
                      Yönetim → Sistem Ayarları → Müşteri tanıtım alanı bölümünden görsel
                      yükleyebilirsiniz.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
