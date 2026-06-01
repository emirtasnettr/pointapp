import { MarketingFooter } from './MarketingFooter';
import { MarketingNav } from './MarketingNav';

type Props = {
  logoUrl: string | null;
  children: React.ReactNode;
};

/** Tanıtım sitesi ortak kabuk: üst menü + alt bilgi (kısa sayfalarda footer altta kalır). */
export function MarketingSiteShell({ logoUrl, children }: Props) {
  return (
    <div className="marketing-site flex min-h-dvh flex-col bg-white text-zinc-900">
      <MarketingNav logoUrl={logoUrl} />
      <div className="flex flex-1 flex-col">{children}</div>
      <MarketingFooter logoUrl={logoUrl} />
    </div>
  );
}
