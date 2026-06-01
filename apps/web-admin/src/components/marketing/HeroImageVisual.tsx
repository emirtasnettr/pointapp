import { ImageIcon } from 'lucide-react';
import type { PublicBrandImage } from '@/lib/brand-public';

type Props = {
  hero: PublicBrandImage;
};

export function HeroImageVisual({ hero }: Props) {
  const url = hero.url?.trim() || null;
  const w = hero.width;
  const h = hero.height;
  const aspectRatio = w && h ? `${w} / ${h}` : '3 / 2';

  return (
    <div className="overflow-hidden rounded-3xl border border-white/30 shadow-soft">
        {url ? (
          <div className="relative w-full" style={{ aspectRatio }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- sistem ayarından dinamik URL */}
            <img
              src={url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              width={w ?? undefined}
              height={h ?? undefined}
            />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 px-8 py-12 text-center"
            style={{ aspectRatio }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
              <ImageIcon className="h-7 w-7" aria-hidden />
            </span>
            <p className="text-sm font-medium text-zinc-600">Hero görseli henüz yüklenmedi</p>
            <p className="max-w-xs text-xs text-zinc-500">
              Yönetim → Sistem Ayarları bölümünden tanıtım sitesi hero görselini yükleyebilirsiniz.
            </p>
          </div>
        )}
    </div>
  );
}
