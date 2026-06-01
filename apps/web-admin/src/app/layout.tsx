import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'Point — Şehir içi anlık teslimat',
    template: '%s · Point',
  },
  description: 'Point kurye marketplace — anlık teslimat ve operasyon platformu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-dvh bg-zinc-100 text-zinc-900 antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
