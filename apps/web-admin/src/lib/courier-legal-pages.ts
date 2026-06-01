export const COURIER_LEGAL_PAGE_SLUGS = [
  'payout-payment-days',
  'courier-partnership-agreement',
  'platform-usage-agreement',
  'courier-service-operations-agreement',
  'kvkk',
  'explicit-consent',
  'cookies',
  'privacy',
  'earnings-payment-policy',
  'commission-deduction-policy',
  'delivery-operation-rules',
  'courier-conduct-disciplinary-policy',
  'vehicle-document-pledge',
  'location-gps-consent',
  'commercial-electronic-consent',
  'delivery-liability-disclaimer',
  'package-content-disclaimer',
  'prohibited-goods-policy',
  'occupational-health-safety',
  'account-suspension-termination',
  'tax-financial-responsibility',
] as const;

export type CourierLegalPageSlug = (typeof COURIER_LEGAL_PAGE_SLUGS)[number];

export const COURIER_LEGAL_PAGE_TITLES: Record<CourierLegalPageSlug, string> = {
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

export type CourierLegalPageDto = {
  slug: string;
  title: string;
  html: string;
  updatedAt: string | null;
};

export type CourierLegalPagesResponse = {
  pages: CourierLegalPageDto[];
};

export const STAFF_COURIER_LEGAL_QUERY_KEY = ['staff', 'courier', 'legal-pages'] as const;

export function isCourierLegalPageSlug(s: string): s is CourierLegalPageSlug {
  return (COURIER_LEGAL_PAGE_SLUGS as readonly string[]).includes(s);
}

export function courierLegalPageTitle(slug: string): string {
  if (isCourierLegalPageSlug(slug)) return COURIER_LEGAL_PAGE_TITLES[slug];
  return 'Bilgi';
}
