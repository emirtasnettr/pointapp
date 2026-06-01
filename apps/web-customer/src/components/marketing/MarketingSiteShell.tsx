import { MarketingFooter } from './MarketingFooter';
import { MarketingNav } from './MarketingNav';

type Props = {
  logoUrl: string | null;
  children: React.ReactNode;
};

/** Tanıtım sitesi ile aynı kabuk: üst menü + alt bilgi. */
export function MarketingSiteShell({ logoUrl, children }: Props) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <MarketingNav logoUrl={logoUrl} />
      {children}
      <MarketingFooter logoUrl={logoUrl} />
    </div>
  );
}
