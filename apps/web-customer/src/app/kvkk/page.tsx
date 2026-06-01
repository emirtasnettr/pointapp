import Link from 'next/link';

export default function KvkkPage() {
  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <Link href="/" className="text-sm font-medium text-brand">
        ← Ana sayfa
      </Link>
      <h1 className="mt-6 text-2xl font-semibold">KVKK</h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Aydınlatma metni ve veri işleme politikası placeholder.
      </p>
    </main>
  );
}
