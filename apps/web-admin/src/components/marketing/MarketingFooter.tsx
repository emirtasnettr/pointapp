import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { MARKETING_FOOTER_LEGAL_LINKS, marketingLegalPath } from '@/lib/marketing-footer-legal';

const CONTACT = {
  phone: '0850 259 45 45',
  phoneHref: 'tel:+908502594545',
  email: 'point@pointdelivery.com.tr',
  address: 'Esentepe, Kasap Sk. Altınay İş Merkezi No:8-10 Şişli/İstanbul',
} as const;

export function MarketingFooter({ logoUrl }: { logoUrl: string | null }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200/80 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Point" className="h-8 w-auto object-contain" />
            ) : (
              <p className="text-lg font-bold text-brand">Point</p>
            )}
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
                  <Link href={marketingLegalPath(item.slug)} className="hover:text-brand">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm sm:col-span-2 lg:col-span-1">
            <ul className="space-y-3 text-zinc-600">
              <li>
                <a
                  href={CONTACT.phoneHref}
                  className="group flex items-start gap-3 transition hover:text-brand"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-xs font-medium text-zinc-500">Çağrı Merkezi</span>
                    <span className="font-medium text-zinc-800 group-hover:text-brand">{CONTACT.phone}</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="group flex items-start gap-3 transition hover:text-brand"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Mail className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-zinc-500">Mail Adresi</span>
                    <span className="break-all font-medium text-zinc-800 group-hover:text-brand">
                      {CONTACT.email}
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-xs font-medium text-zinc-500">Adres</span>
                    <span className="leading-relaxed text-zinc-800">{CONTACT.address}</span>
                  </span>
                </div>
              </li>
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
