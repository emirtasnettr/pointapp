import type { LegalPageDef } from './legal-pages.constants';

export const COURIER_LEGAL_PAGES: readonly LegalPageDef[] = [
  {
    slug: 'payout-payment-days',
    title: 'Hangi günler ödeme alabilirim?',
    settingKey: 'legal.courier.content.payout-payment-days',
  },
  {
    slug: 'courier-partnership-agreement',
    title: 'Kurye İş Ortaklığı Sözleşmesi',
    settingKey: 'legal.courier.content.courier-partnership-agreement',
  },
  {
    slug: 'platform-usage-agreement',
    title: 'Platform Kullanım Sözleşmesi',
    settingKey: 'legal.courier.content.platform-usage-agreement',
  },
  {
    slug: 'courier-service-operations-agreement',
    title: 'Kurye Hizmet ve İşleyiş Sözleşmesi',
    settingKey: 'legal.courier.content.courier-service-operations-agreement',
  },
  {
    slug: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    settingKey: 'legal.courier.content.kvkk',
  },
  {
    slug: 'explicit-consent',
    title: 'Açık Rıza Metni',
    settingKey: 'legal.courier.content.explicit-consent',
  },
  {
    slug: 'cookies',
    title: 'Çerez (Cookie) Politikası',
    settingKey: 'legal.courier.content.cookies',
  },
  {
    slug: 'privacy',
    title: 'Gizlilik Politikası',
    settingKey: 'legal.courier.content.privacy',
  },
  {
    slug: 'earnings-payment-policy',
    title: 'Hakediş ve Ödeme Politikası',
    settingKey: 'legal.courier.content.earnings-payment-policy',
  },
  {
    slug: 'commission-deduction-policy',
    title: 'Komisyon ve Kesinti Politikası',
    settingKey: 'legal.courier.content.commission-deduction-policy',
  },
  {
    slug: 'delivery-operation-rules',
    title: 'Teslimat Operasyon Kuralları',
    settingKey: 'legal.courier.content.delivery-operation-rules',
  },
  {
    slug: 'courier-conduct-disciplinary-policy',
    title: 'Kurye Davranış ve Disiplin Politikası',
    settingKey: 'legal.courier.content.courier-conduct-disciplinary-policy',
  },
  {
    slug: 'vehicle-document-pledge',
    title: 'Araç ve Evrak Taahhütnamesi',
    settingKey: 'legal.courier.content.vehicle-document-pledge',
  },
  {
    slug: 'location-gps-consent',
    title: 'Konum Takibi ve GPS Onay Metni',
    settingKey: 'legal.courier.content.location-gps-consent',
  },
  {
    slug: 'commercial-electronic-consent',
    title: 'Elektronik Ticari İleti Onay Metni',
    settingKey: 'legal.courier.content.commercial-electronic-consent',
  },
  {
    slug: 'delivery-liability-disclaimer',
    title: 'Teslimat Sorumluluk Reddi Beyanı',
    settingKey: 'legal.courier.content.delivery-liability-disclaimer',
  },
  {
    slug: 'package-content-disclaimer',
    title: 'Paket İçeriği Sorumluluk Reddi Metni',
    settingKey: 'legal.courier.content.package-content-disclaimer',
  },
  {
    slug: 'prohibited-goods-policy',
    title: 'Yasaklı Ürün Taşıma Politikası',
    settingKey: 'legal.courier.content.prohibited-goods-policy',
  },
  {
    slug: 'occupational-health-safety',
    title: 'İş Sağlığı ve Güvenliği Bilgilendirme Metni',
    settingKey: 'legal.courier.content.occupational-health-safety',
  },
  {
    slug: 'account-suspension-termination',
    title: 'Hesap Askıya Alma ve Fesih Politikası',
    settingKey: 'legal.courier.content.account-suspension-termination',
  },
  {
    slug: 'tax-financial-responsibility',
    title: 'Vergi ve Mali Sorumluluk Beyanı',
    settingKey: 'legal.courier.content.tax-financial-responsibility',
  },
] as const;

const SLUG_TO_DEF = new Map(COURIER_LEGAL_PAGES.map((p) => [p.slug, p]));

export function getCourierLegalPageDef(slug: string): LegalPageDef | undefined {
  return SLUG_TO_DEF.get(slug);
}

export function isCourierLegalPageSlug(s: string): boolean {
  return SLUG_TO_DEF.has(s);
}
