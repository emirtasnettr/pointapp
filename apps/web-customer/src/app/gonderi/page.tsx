import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Eski müşteri web URL’si → tanıtım sitesindeki gönderi akışına yönlendirir. */
export default async function GonderiRedirectPage({ searchParams }: Props) {
  const base =
    process.env.NEXT_PUBLIC_MARKETING_WEB_URL?.replace(/\/$/, '') ?? 'http://localhost:7200';
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === 'string') q.set(key, val);
    else if (Array.isArray(val) && val[0]) q.set(key, val[0]);
  }
  const qs = q.toString();
  redirect(qs ? `${base}/gonderi?${qs}` : `${base}/gonderi`);
}
