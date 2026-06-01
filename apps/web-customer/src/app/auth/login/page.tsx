import { redirect } from 'next/navigation';
import { marketingWebPath } from '@/lib/marketing-web';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Eski müşteri web giriş URL’si → tanıtım sitesi. */
export default async function CustomerLoginRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === 'string') q.set(key, val);
    else if (Array.isArray(val) && val[0]) q.set(key, val[0]);
  }
  const qs = q.toString();
  redirect(qs ? `${marketingWebPath('/musteri/giris')}?${qs}` : marketingWebPath('/musteri/giris'));
}
