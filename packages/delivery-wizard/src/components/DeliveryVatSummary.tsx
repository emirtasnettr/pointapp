import { Loader2 } from 'lucide-react';
import type { DeliveryVatPricing } from '../lib/delivery-vat';
import { formatTry } from '../lib/format';

export function DeliveryVatSummary({
  pricing,
  loading,
  compact,
}: {
  pricing: DeliveryVatPricing | null;
  loading?: boolean;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div
        className={`flex justify-center rounded-xl border border-zinc-200/90 bg-zinc-50/90 py-6 dark:border-white/10 dark:bg-white/5 ${compact ? '' : 'mt-1'}`}
      >
        <Loader2 className="h-6 w-6 animate-spin text-[#16B24B]" aria-hidden />
      </div>
    );
  }

  if (!pricing) return null;

  return (
    <div
      className={`space-y-2 rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-3.5 py-3 dark:border-white/10 dark:bg-white/5 ${compact ? '' : 'mt-1'}`}
    >
      <PriceLine label="Teslimat ücreti" value={formatTry(pricing.serviceAmount)} />
      <PriceLine label="KDV (%20)" value={formatTry(pricing.vatAmount)} muted />
      <div className="my-0.5 h-px bg-zinc-200 dark:bg-white/10" />
      <PriceLine label="Genel toplam" value={formatTry(pricing.totalPrice)} strong />
    </div>
  );
}

function PriceLine({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          strong
            ? 'text-[15px] font-extrabold text-zinc-900 dark:text-zinc-50'
            : muted
              ? 'text-sm font-medium text-zinc-500'
              : 'text-sm font-semibold text-zinc-600 dark:text-zinc-400'
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? 'text-lg font-extrabold text-[#16B24B]'
            : muted
              ? 'text-[15px] font-semibold text-zinc-600 dark:text-zinc-400'
              : 'text-[15px] font-bold text-zinc-900 dark:text-zinc-50'
        }
      >
        {value}
      </span>
    </div>
  );
}
