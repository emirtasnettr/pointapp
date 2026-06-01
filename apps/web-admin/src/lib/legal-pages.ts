export const LEGAL_PAGE_SLUGS = [
  'service-agreement',
  'user-agreement',
  'distance-service-agreement',
  'kvkk',
  'explicit-consent',
  'cookies',
  'privacy',
  'delivery-transport-terms',
  'prohibited-goods-policy',
  'payment-refund',
  'corporate-account-agreement',
  'corporate-framework-agreement',
  'commercial-electronic-consent',
  'membership-cancellation',
  'platform-terms',
  'delivery-liability-disclaimer',
  'package-content-declaration',
  'prohibited-dangerous-goods-pledge',
] as const;

export type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];

export const LEGAL_PAGE_TITLES: Record<LegalPageSlug, string> = {
  'service-agreement': 'Hizmet Sözleşmesi',
  'user-agreement': 'Kullanıcı Sözleşmesi',
  'distance-service-agreement': 'Mesafeli Hizmet Sözleşmesi',
  kvkk: 'KVKK Aydınlatma Metni',
  'explicit-consent': 'Açık Rıza Metni',
  cookies: 'Çerez (Cookie) Politikası',
  privacy: 'Gizlilik Politikası',
  'delivery-transport-terms': 'Teslimat ve Taşıma Koşulları',
  'prohibited-goods-policy': 'Yasaklı Ürün ve Taşıma Kuralları Politikası',
  'payment-refund': 'Ödeme ve İade Politikası',
  'corporate-account-agreement': 'Cari Hesap Kullanım Sözleşmesi',
  'corporate-framework-agreement': 'Kurumsal Müşteri Çerçeve Hizmet Sözleşmesi',
  'commercial-electronic-consent': 'Elektronik Ticari İleti Onay Metni',
  'membership-cancellation': 'Üyelik İptali ve Hesap Kapatma Politikası',
  'platform-terms': 'Dijital Platform Kullanım Koşulları',
  'delivery-liability-disclaimer': 'Teslimat Sorumluluk Reddi Beyanı',
  'package-content-declaration': 'Paket İçeriği Beyan ve Sorumluluk Taahhüdü',
  'prohibited-dangerous-goods-pledge': 'Yasadışı / Tehlikeli Ürün Taşımama Taahhüdü',
};

export type LegalPageDto = {
  slug: string;
  title: string;
  corporateOnly?: boolean;
  html: string;
  updatedAt: string | null;
};

export type LegalPagesResponse = {
  pages: LegalPageDto[];
};

export const STAFF_LEGAL_QUERY_KEY = ['staff', 'legal-pages'] as const;

export function isLegalPageSlug(s: string): s is LegalPageSlug {
  return (LEGAL_PAGE_SLUGS as readonly string[]).includes(s);
}

export function legalPageTitle(slug: string): string {
  if (isLegalPageSlug(slug)) return LEGAL_PAGE_TITLES[slug];
  return 'Bilgi';
}
