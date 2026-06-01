'use client';

import { ChevronRight } from 'lucide-react';
import type { CustomerDeliveryServiceType } from '../lib/delivery-service-types';
import { getDeliveryTypeSectionEntries } from '../lib/delivery-type-section-entries';

export function DeliveryServiceWizardSelect({
  onSelect,
}: {
  onSelect: (type: CustomerDeliveryServiceType) => void;
}) {
  const entries = getDeliveryTypeSectionEntries();
  /** 2 sütunda tek kalan kart için (lg’de 3 sütun kullanılır). */
  const needsSpacerCol2 = entries.length % 2 === 1;

  const cardClass =
    'flex min-h-[152px] w-full flex-col rounded-2xl border border-zinc-200/90 bg-white p-3.5 text-left shadow-sm transition hover:border-[#16B24B]/25 hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-zinc-900/50';

  return (
    <div className="mx-auto grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {entries.map((entry) => {
        if (entry.kind === 'selectable') {
          const item = entry.data;
          const Icon = item.Icon;
          const [from, to] = item.accentGradient;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onSelect(item.type)}
              className={cardClass}
            >
              <span
                className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              >
                <Icon className="h-6 w-6" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="text-[15px] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                {item.title}
              </span>
              <span className="mt-1.5 flex-1 text-xs font-medium leading-snug text-zinc-500">{item.subtitle}</span>
              <span className="mt-3 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-white/10">
                <span className="text-[13px] font-bold text-[#16B24B]">Seç</span>
                <ChevronRight className="h-[18px] w-[18px] text-[#16B24B]" strokeWidth={2.4} aria-hidden />
              </span>
            </button>
          );
        }
        const item = entry.data;
        const Icon = item.Icon;
        const [from, to] = item.gradient;
        return (
          <div
            key={item.id}
            className={`${cardClass} opacity-90`}
          >
            <span
              className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            >
              <Icon className="h-6 w-6" strokeWidth={2.2} aria-hidden />
            </span>
            <span className="text-[15px] font-bold leading-tight text-zinc-900 dark:text-zinc-50">{item.title}</span>
            <span className="mt-1.5 flex-1 text-xs font-medium leading-snug text-zinc-500">{item.subtitle}</span>
            <span className="mt-3 border-t border-zinc-200/60 pt-3 text-[13px] font-bold text-zinc-400 dark:border-white/10">
              Yakında
            </span>
          </div>
        );
      })}
      {needsSpacerCol2 ? <div aria-hidden className="min-h-[152px] lg:hidden" /> : null}
    </div>
  );
}
