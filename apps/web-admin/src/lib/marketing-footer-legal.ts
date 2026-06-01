/** Tanıtım sitesi footer — yasal sayfa bağlantıları (slug → API `public/legal/:slug`). */
export const MARKETING_FOOTER_LEGAL_LINKS = [
  { label: 'İptal & İade Politikası', slug: 'payment-refund' },
  { label: 'Mesafeli Satış Sözleşmesi', slug: 'distance-service-agreement' },
  { label: 'KVKK Aydınlatma Metni', slug: 'kvkk' },
  { label: 'Çerez Politikası', slug: 'cookies' },
] as const;

export type MarketingFooterLegalSlug = (typeof MARKETING_FOOTER_LEGAL_LINKS)[number]['slug'];

export function marketingLegalPath(slug: string): string {
  return `/yasal/${slug}`;
}
