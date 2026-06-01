'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-100 px-6 text-center text-zinc-900">
      <p className="text-sm font-medium text-brand">Beklenmeyen hata</p>
      <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
      <p className="max-w-md text-sm text-zinc-600">{error.message || 'Sayfa yüklenirken sorun oluştu.'}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
      >
        Tekrar dene
      </button>
    </div>
  );
}
