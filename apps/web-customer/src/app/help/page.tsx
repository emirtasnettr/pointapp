import Link from 'next/link';

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <Link href="/" className="text-sm font-medium text-brand">
        ← Ana sayfa
      </Link>
      <h1 className="mt-6 text-2xl font-semibold">Yardım</h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Geliştirme ortamında müşteri paneline giriş için seed kullanıcısı:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <li>
          <span className="font-medium">E-posta:</span> musteri@pointdelivery.com.tr
        </li>
        <li>
          <span className="font-medium">Şifre:</span> 12345678
        </li>
      </ul>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        API ve veritabanı için proje kökünde <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">docker compose up -d</code>, ardından{' '}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">npm run db:migrate</code> ve{' '}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">npm run db:seed</code> çalıştırın.
      </p>
    </main>
  );
}
