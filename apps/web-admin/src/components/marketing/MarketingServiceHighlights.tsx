import { BadgePercent, ShieldCheck, Zap, type LucideIcon } from 'lucide-react';

const HIGHLIGHTS: { title: string; Icon: LucideIcon }[] = [
  { title: 'Hızlı', Icon: Zap },
  { title: 'Güvenli', Icon: ShieldCheck },
  { title: 'Rekabetçi Fiyat', Icon: BadgePercent },
];

export function MarketingServiceHighlights() {
  return (
    <ul className="mt-6 hidden max-w-sm space-y-2 lg:block" aria-label="Öne çıkan özellikler">
      {HIGHLIGHTS.map(({ title, Icon }) => (
        <li
          key={title}
          className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/25">
            <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">{title}</span>
        </li>
      ))}
    </ul>
  );
}
