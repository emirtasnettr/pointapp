import { marketingWebPath } from '@/lib/marketing-web';
import { MARKETING_FOOTER_LEGAL_LINKS, marketingLegalPath } from '@/lib/marketing-footer-legal';

export function MarketingFooter({ logoUrl }: { logoUrl: string | null }) {
  const year = new Date().getFullYear();
  const homeUrl = marketingWebPath('/');

  return (
    <footer className="border-t border-zinc-200/80 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <a href={homeUrl}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Point" className="h-8 w-auto object-contain" />
              ) : (
                <p className="text-lg font-bold text-brand">Point</p>
              )}
            </a>
            <p className="mt-3 max-w-xs text-sm text-zinc-600">
              Şehir içi anlık teslimat platformu — işletmeler ve bireyler için hızlı kurye, kuryeler için
              şeffaf hakediş.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-zinc-900">Yasal</p>
            <ul className="mt-3 space-y-2 text-zinc-600">
              {MARKETING_FOOTER_LEGAL_LINKS.map((item) => (
                <li key={item.slug}>
                  <a href={marketingLegalPath(item.slug)} className="hover:text-brand">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-zinc-200/80 pt-6 text-center text-xs text-zinc-500">
          © {year} Point. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
