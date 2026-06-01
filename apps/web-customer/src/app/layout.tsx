import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Point — Teslimat',
  description: 'Point anlık teslimat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className="min-h-dvh bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
