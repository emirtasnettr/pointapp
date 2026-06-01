'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, Navigation } from 'lucide-react';
import { DistrictSearchSelect } from '@/components/marketing/DistrictSearchSelect';
import { resolveDeliveryVatPricing } from '@/lib/delivery-vat';
import { formatTry } from '@/lib/format';
import { fetchDistrictQuote, fetchGeoDistricts } from '@/lib/geography-public';
import { cn } from '@/lib/cn';

type Props = {
  className?: string;
};

export function MarketingQuickQuoteCard({ className }: Props) {
  const [pickupDistrictId, setPickupDistrictId] = useState('');
  const [dropoffDistrictId, setDropoffDistrictId] = useState('');
  const [quote, setQuote] = useState<ReturnType<typeof resolveDeliveryVatPricing> | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);

  const districtsQuery = useQuery({
    queryKey: ['geography', 'districts'],
    queryFn: fetchGeoDistricts,
    staleTime: 60_000,
  });
  const districts = districtsQuery.data ?? [];

  const districtsReady = Boolean(pickupDistrictId && dropoffDistrictId && pickupDistrictId !== dropoffDistrictId);

  useEffect(() => {
    if (!districtsReady) {
      setQuote(null);
      setQuoteErr(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteErr(null);
    const timer = setTimeout(() => {
      void fetchDistrictQuote({ pickupDistrictId, dropoffDistrictId })
        .then((q) => {
          if (!cancelled) setQuote(resolveDeliveryVatPricing(q));
        })
        .catch((e: Error) => {
          if (!cancelled) {
            setQuote(null);
            setQuoteErr(e.message);
          }
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [districtsReady, pickupDistrictId, dropoffDistrictId]);

  const routeLabel = useMemo(() => {
    const from = districts.find((d) => d.id === pickupDistrictId)?.name;
    const to = districts.find((d) => d.id === dropoffDistrictId)?.name;
    if (!from || !to) return null;
    return { from, to };
  }, [districts, pickupDistrictId, dropoffDistrictId]);

  const sameDistrict = Boolean(
    pickupDistrictId && dropoffDistrictId && pickupDistrictId === dropoffDistrictId,
  );

  const continueHref = `/gonderi?${new URLSearchParams({
    pickupDistrictId,
    dropoffDistrictId,
  }).toString()}`;

  const canContinue = districtsReady && Boolean(quote) && !quoteLoading;

  return (
    <div className={cn('relative w-full', className)}>
      <article className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.8)_inset]">
        {/* Üst şerit */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">Hızlı gönderi talebi</h2>
            <p className="mt-0.5 text-sm text-zinc-500">İlçe seçin, tahmini fiyatı görün</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white sm:inline-flex">
            <Navigation className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            Anında
          </span>
        </div>

        <div className="space-y-5 px-6 py-6">
          {/* Rota */}
          <div className="rounded-2xl bg-zinc-100/80 p-4 ring-1 ring-zinc-200/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
              <DistrictSearchSelect
                id="quick-pickup-district"
                label="Nereden"
                hint="Alım"
                value={pickupDistrictId}
                onChange={setPickupDistrictId}
                disabled={districtsQuery.isLoading}
                districts={districts}
              />

              <div
                className="hidden shrink-0 pb-3 text-zinc-300 sm:flex sm:items-center sm:justify-center"
                aria-hidden
              >
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </div>

              <DistrictSearchSelect
                id="quick-dropoff-district"
                label="Nereye"
                hint="Teslim"
                value={dropoffDistrictId}
                onChange={setDropoffDistrictId}
                disabled={districtsQuery.isLoading}
                districts={districts}
              />
            </div>

            {routeLabel && !sameDistrict ? (
              <p className="mt-4 border-t border-zinc-200/80 pt-3 text-center text-xs text-zinc-500">
                <span className="font-semibold text-zinc-700">{routeLabel.from}</span>
                <span className="mx-2 text-zinc-300">→</span>
                <span className="font-semibold text-zinc-700">{routeLabel.to}</span>
              </p>
            ) : null}
          </div>

          {sameDistrict ? (
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800">
              Alım ve teslim ilçesi farklı olmalıdır.
            </p>
          ) : null}

          {/* Fiyat paneli */}
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl transition-all duration-500',
              quote ? 'bg-brand' : 'bg-zinc-50 ring-1 ring-zinc-200/70',
            )}
          >
            {quoteLoading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
                <span className="text-sm font-medium text-zinc-500">Hesaplanıyor…</span>
              </div>
            ) : quote ? (
              <div className="px-6 py-6 text-center">
                <p className="text-xs font-medium tracking-wide text-white/85">
                  KDV dahil tahmini tutar
                </p>
                <p className="mt-2 text-[2.5rem] font-bold leading-none tabular-nums tracking-tight text-white">
                  {formatTry(quote.totalPrice)}
                </p>
              </div>
            ) : quoteErr ? (
              <p className="px-4 py-4 text-center text-sm text-amber-800">{quoteErr}</p>
            ) : (
              <div className="px-6 py-7 text-center">
                <p className="text-sm leading-relaxed text-zinc-500">
                  İlçeleri seçtiğinizde tutar burada görünecek.
                </p>
              </div>
            )}
          </div>

          {canContinue ? (
            <Link
              href={continueHref}
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#16B24B] py-4 text-[15px] font-semibold text-white transition hover:bg-[#14a344] active:scale-[0.99]"
            >
              Gönderi oluştur
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white/25">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-2xl bg-zinc-200 py-4 text-[15px] font-semibold text-zinc-400"
            >
              Gönderi oluştur
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-300/50">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          )}

          <p className="text-center text-xs text-zinc-400">
            Sonraki adımda adres ve iletişim bilgileri
          </p>
        </div>
      </article>
    </div>
  );
}
