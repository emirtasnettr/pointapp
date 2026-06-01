import { marketingWebPath } from '@/lib/marketing-web';

export const MARKETING_FOOTER_LEGAL_LINKS = [
  { label: 'İptal & İade Politikası', slug: 'payment-refund' },
  { label: 'Mesafeli Satış Sözleşmesi', slug: 'distance-service-agreement' },
  { label: 'KVKK Aydınlatma Metni', slug: 'kvkk' },
  { label: 'Çerez Politikası', slug: 'cookies' },
] as const;

export function marketingLegalPath(slug: string): string {
  return marketingWebPath(`/yasal/${slug}`);
}
