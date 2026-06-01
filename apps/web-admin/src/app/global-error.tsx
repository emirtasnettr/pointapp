'use client';

import { useEffect } from 'react';
import './globals.css';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-dvh bg-zinc-100 text-zinc-900 antialiased" suppressHydrationWarning>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm font-medium text-brand">Uygulama hatası</p>
          <h1 className="text-xl font-semibold">Point Yönetim</h1>
          <p className="max-w-md text-sm text-zinc-600">{error.message || 'Kök şablonda sorun oluştu.'}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
