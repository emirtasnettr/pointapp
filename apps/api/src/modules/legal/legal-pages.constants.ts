export type LegalPageDef = {
  slug: string;
  title: string;
  settingKey: string;
  /** Yalnızca kurumsal (KM) müşteri hesabında listelenir */
  corporateOnly?: boolean;
};

export const LEGAL_PAGES: readonly LegalPageDef[] = [
  { slug: 'service-agreement', title: 'Hizmet Sözleşmesi', settingKey: 'legal.content.service-agreement' },
  { slug: 'user-agreement', title: 'Kullanıcı Sözleşmesi', settingKey: 'legal.content.user-agreement' },
  {
    slug: 'distance-service-agreement',
    title: 'Mesafeli Hizmet Sözleşmesi',
    settingKey: 'legal.content.distance-service-agreement',
  },
  { slug: 'kvkk', title: 'KVKK Aydınlatma Metni', settingKey: 'legal.content.kvkk' },
  { slug: 'explicit-consent', title: 'Açık Rıza Metni', settingKey: 'legal.content.explicit-consent' },
  {
    slug: 'cookies',
    title: 'Çerez (Cookie) Politikası',
    settingKey: 'legal.content.cookies',
  },
  { slug: 'privacy', title: 'Gizlilik Politikası', settingKey: 'legal.content.privacy' },
  {
    slug: 'delivery-transport-terms',
    title: 'Teslimat ve Taşıma Koşulları',
    settingKey: 'legal.content.delivery-transport-terms',
  },
  {
    slug: 'prohibited-goods-policy',
    title: 'Yasaklı Ürün ve Taşıma Kuralları Politikası',
    settingKey: 'legal.content.prohibited-goods-policy',
  },
  {
    slug: 'payment-refund',
    title: 'Ödeme ve İade Politikası',
    settingKey: 'legal.content.payment-refund',
  },
  {
    slug: 'corporate-account-agreement',
    title: 'Cari Hesap Kullanım Sözleşmesi',
    settingKey: 'legal.content.corporate-account-agreement',
    corporateOnly: true,
  },
  {
    slug: 'corporate-framework-agreement',
    title: 'Kurumsal Müşteri Çerçeve Hizmet Sözleşmesi',
    settingKey: 'legal.content.corporate-framework-agreement',
  },
  {
    slug: 'commercial-electronic-consent',
    title: 'Elektronik Ticari İleti Onay Metni',
    settingKey: 'legal.content.commercial-electronic-consent',
  },
  {
    slug: 'membership-cancellation',
    title: 'Üyelik İptali ve Hesap Kapatma Politikası',
    settingKey: 'legal.content.membership-cancellation',
  },
  {
    slug: 'platform-terms',
    title: 'Dijital Platform Kullanım Koşulları',
    settingKey: 'legal.content.platform-terms',
  },
  {
    slug: 'delivery-liability-disclaimer',
    title: 'Teslimat Sorumluluk Reddi Beyanı',
    settingKey: 'legal.content.delivery-liability-disclaimer',
  },
  {
    slug: 'package-content-declaration',
    title: 'Paket İçeriği Beyan ve Sorumluluk Taahhüdü',
    settingKey: 'legal.content.package-content-declaration',
  },
  {
    slug: 'prohibited-dangerous-goods-pledge',
    title: 'Yasadışı / Tehlikeli Ürün Taşımama Taahhüdü',
    settingKey: 'legal.content.prohibited-dangerous-goods-pledge',
  },
] as const;

export const LEGAL_PAGE_SLUGS = LEGAL_PAGES.map((p) => p.slug);

export type LegalPageSlug = (typeof LEGAL_PAGES)[number]['slug'];

const SLUG_TO_DEF = new Map(LEGAL_PAGES.map((p) => [p.slug, p]));

export function getLegalPageDef(slug: string): LegalPageDef | undefined {
  return SLUG_TO_DEF.get(slug);
}

export function isLegalPageSlug(s: string): boolean {
  return SLUG_TO_DEF.has(s);
}

export function legalSettingKeys(): string[] {
  return LEGAL_PAGES.map((p) => p.settingKey);
}
