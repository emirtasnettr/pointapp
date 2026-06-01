'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { PUBLIC_BRAND_QUERY_KEY, fetchPublicBrand } from '@/lib/brand-public';
import { cn } from '@/lib/cn';

type Props = {
  /** Kenar çubuğu daraltılmışken yalnızca kare alan. */
  sidebarCollapsed?: boolean;
  /** Mobilde menü kapatıldığında */
  onNavigate?: () => void;
};

export function AdminBrandMark({ sidebarCollapsed, onNavigate }: Props) {
  const q = useQuery({
    queryKey: PUBLIC_BRAND_QUERY_KEY,
    queryFn: fetchPublicBrand,
    staleTime: 120_000,
  });
  const light = q.data?.logoLightUrl?.trim() || null;

  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={cn('flex min-w-0 items-center gap-2', sidebarCollapsed && 'justify-center')}
    >
      {light ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden',
            sidebarCollapsed ? 'h-9 w-9' : 'h-9 max-w-[200px] px-0',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- harici API URL */}
          <img
            src={light}
            alt="Point"
            className={cn('max-h-8 w-auto object-contain object-left', sidebarCollapsed && 'max-h-7 max-w-[2.25rem]')}
          />
        </span>
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center text-brand">
          <Sparkles className="h-4 w-4" />
        </span>
      )}
      {!sidebarCollapsed && !light ? (
        <span className="truncate text-sm font-semibold tracking-tight text-zinc-900">Point Yönetim</span>
      ) : null}
    </Link>
  );
}
