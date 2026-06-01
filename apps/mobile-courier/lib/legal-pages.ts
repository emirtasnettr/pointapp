export const LEGAL_PAGE_TITLES: Record<string, string> = {
  'payout-payment-days': 'Hangi günler ödeme alabilirim?',
  'courier-partnership-agreement': 'Kurye İş Ortaklığı Sözleşmesi',
  'platform-usage-agreement': 'Platform Kullanım Sözleşmesi',
  'courier-service-operations-agreement': 'Kurye Hizmet ve İşleyiş Sözleşmesi',
  kvkk: 'KVKK Aydınlatma Metni',
  'explicit-consent': 'Açık Rıza Metni',
  cookies: 'Çerez (Cookie) Politikası',
  privacy: 'Gizlilik Politikası',
  'earnings-payment-policy': 'Hakediş ve Ödeme Politikası',
  'commission-deduction-policy': 'Komisyon ve Kesinti Politikası',
  'delivery-operation-rules': 'Teslimat Operasyon Kuralları',
  'courier-conduct-disciplinary-policy': 'Kurye Davranış ve Disiplin Politikası',
  'vehicle-document-pledge': 'Araç ve Evrak Taahhütnamesi',
  'location-gps-consent': 'Konum Takibi ve GPS Onay Metni',
  'commercial-electronic-consent': 'Elektronik Ticari İleti Onay Metni',
  'delivery-liability-disclaimer': 'Teslimat Sorumluluk Reddi Beyanı',
  'package-content-disclaimer': 'Paket İçeriği Sorumluluk Reddi Metni',
  'prohibited-goods-policy': 'Yasaklı Ürün Taşıma Politikası',
  'occupational-health-safety': 'İş Sağlığı ve Güvenliği Bilgilendirme Metni',
  'account-suspension-termination': 'Hesap Askıya Alma ve Fesih Politikası',
  'tax-financial-responsibility': 'Vergi ve Mali Sorumluluk Beyanı',
};

export type LegalPageSummary = {
  slug: string;
  title: string;
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
