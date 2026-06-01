'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicBrand } from '@/lib/brand-public';
import { cn } from '@/lib/cn';

const QK = ['public', 'brand'] as const;

type Variant = 'header' | 'card';

type Props = {
  variant?: Variant;
  onNavigate?: () => void;
};

export function CustomerBrandMark({ variant = 'header', onNavigate }: Props) {
  const q = useQuery({
    queryKey: QK,
    queryFn: fetchPublicBrand,
    staleTime: 120_000,
  });
  const rawL = q.data?.logoLightUrl?.trim() || null;
  const rawD = q.data?.logoDarkUrl?.trim() || null;
  const lightUrl = rawL || rawD;
  const darkUrl = rawD || rawL;

  const imgClass =
    variant === 'card'
      ? 'max-h-11 w-auto max-w-[220px] object-contain object-left'
      : 'max-h-8 w-auto max-w-[200px] object-contain object-left';

  const inner = !lightUrl ? (
    variant === 'card' ? (
      <p className="text-sm font-medium uppercase tracking-widest text-brand">Point</p>
    ) : (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-soft">
          P
        </span>
        <span className="truncate text-sm font-semibold tracking-tight">Point</span>
      </>
    )
  ) : (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- API’den dinamik URL */}
      <img src={lightUrl} alt="Point" className={cn(imgClass, 'dark:hidden')} />
      {/* eslint-disable-next-line @next/next/no-img-element -- API’den dinamik URL */}
      <img src={darkUrl ?? lightUrl} alt="Point" className={cn(imgClass, 'hidden dark:block')} />
    </>
  );

  if (variant === 'card') {
    return inner;
  }

  return (
    <Link href="/panel" onClick={onNavigate} className="flex min-w-0 items-center gap-2">
      {inner}
    </Link>
  );
}
