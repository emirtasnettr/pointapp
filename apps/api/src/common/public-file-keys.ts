/** Kimlik doğrulamasız indirilebilir yerel dosya anahtarları (logo, kampanya görselleri). */
const PUBLIC_KEY_PREFIXES = [
  'brand-logo-',
  'marketing-hero-',
  'marketing-customer-showcase-',
  'marketing-campaign-',
  'marketing-service-',
] as const;

export function isPublicLocalFileKey(key: string): boolean {
  const k = key.trim();
  if (!k || k.includes('..')) return false;
  return PUBLIC_KEY_PREFIXES.some((p) => k.startsWith(p));
}
