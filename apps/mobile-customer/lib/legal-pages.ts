/** Başlık yedekleri — API yanıtı yoksa kullanılır */
export const LEGAL_PAGE_TITLES: Record<string, string> = {
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

export type LegalPageSummary = {
  slug: string;
  title: string;
  corporateOnly?: boolean;
};

export type LegalPageResponse = {
  slug: string;
  title: string;
  html: string;
  updatedAt: string | null;
};

export type LegalPagesListResponse = {
  pages: LegalPageSummary[];
};

export function legalPageTitle(slug: string): string {
  return LEGAL_PAGE_TITLES[slug] ?? 'Bilgi';
}

export function visibleLegalPages(
  pages: LegalPageSummary[],
  customerType?: string | null,
): LegalPageSummary[] {
  const isCorporate = customerType === 'CORPORATE';
  return pages.filter((p) => !p.corporateOnly || isCorporate);
}
