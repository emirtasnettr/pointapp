/** Tanıtım / marketing sitesi (web-admin). */
export function marketingWebBase(): string {
  const raw = process.env.NEXT_PUBLIC_MARKETING_WEB_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:7200';
}

export function marketingWebPath(path: string): string {
  const base = marketingWebBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
