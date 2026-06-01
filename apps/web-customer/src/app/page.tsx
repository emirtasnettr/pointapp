import Link from 'next/link';
import { fetchPublicBrand } from '@/lib/brand-public';
import { customerLoginUrl } from '@/lib/customer-login-url';

export default async function Home() {
  const brand = await fetchPublicBrand();
  const rawL = brand.logoLightUrl?.trim() || null;
  const rawD = brand.logoDarkUrl?.trim() || null;
  const lightUrl = rawL || rawD;
  const darkUrl = rawD || rawL;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-50 to-white p-8 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white/70 p-8 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        {lightUrl ? (
          <div className="flex min-h-[3.25rem] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- API’den dinamik URL */}
            <img src={lightUrl} alt="" className="max-h-14 w-auto object-contain dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element -- API’den dinamik URL */}
            <img src={darkUrl ?? lightUrl} alt="" className="hidden max-h-14 w-auto object-contain dark:block" />
          </div>
        ) : (
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Point</p>
        )}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Anlık teslimat</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Premium müşteri deneyimi: teslimat oluştur, siparişlerini takip et, adreslerini yönet.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={customerLoginUrl()}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-200/80 py-3 text-[20px] font-semibold text-zinc-800 transition hover:border-brand/40 hover:text-brand dark:border-white/10 dark:text-zinc-100 sm:text-sm"
          >
            Müşteri Girişi
          </Link>
          <Link
            href="/panel"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-200/80 py-3 text-sm font-semibold text-zinc-800 transition hover:border-brand/40 hover:text-brand dark:border-white/10 dark:text-zinc-100"
          >
            Panele git
          </Link>
          <Link
            href="/gonderi"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-brand py-3 text-[20px] font-semibold text-white shadow-soft transition hover:opacity-90 sm:text-sm"
          >
            Kurye Çağır
          </Link>
          <Link
            href="/delivery/new"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-200/80 py-3 text-sm font-semibold text-zinc-800 transition hover:border-brand/40 dark:border-white/10 dark:text-zinc-100"
          >
            Panel — yeni teslimat
          </Link>
        </div>
        <div className="mt-8 flex justify-center gap-4 text-xs text-zinc-500">
          <Link href="/help" className="hover:text-brand">
            Yardım
          </Link>
          <Link href="/kvkk" className="hover:text-brand">
            KVKK
          </Link>
        </div>
      </div>
    </main>
  );
}
