import { apiGetAuth, apiPostAuth } from './api';

export const COURIER_REGISTRATION_LEGAL_LINKS = [
  { label: 'Kurye İş Ortaklığı Sözleşmesi', slug: 'courier-partnership-agreement' },
  { label: 'Platform Kullanım Koşulları', slug: 'platform-usage-agreement' },
  { label: 'KVKK Aydınlatma Metni', slug: 'kvkk' },
  { label: 'Hakediş ve Ödeme Politikası', slug: 'earnings-payment-policy' },
  { label: 'Teslimat Operasyon Kuralları', slug: 'delivery-operation-rules' },
  { label: 'Sorumluluk Beyanı', slug: 'delivery-liability-disclaimer' },
] as const;

export type CourierConsentsStatus = {
  registrationTerms: { granted: boolean; recordedAt: string; source: string } | null;
  marketingNotifications: { granted: boolean; recordedAt: string; source: string } | null;
  needsTermsAcceptance: boolean;
};

export function fetchCourierConsentsStatus() {
  return apiGetAuth<CourierConsentsStatus>('/courier/me/consents');
}

export function acceptCourierConsents(body: { acceptedTerms: true; marketingOptIn: boolean }) {
  return apiPostAuth<CourierConsentsStatus>('/courier/me/consents', body);
}

export { routeCourierAfterAuth } from './courier-onboarding';
