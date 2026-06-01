import { apiGetAuth } from './api';

export type CourierSupportLine = {
  supportLinePhone: string | null;
};

export async function fetchCourierSupportLine(): Promise<CourierSupportLine> {
  return apiGetAuth<CourierSupportLine>('/courier/me/support-line');
}

export function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}
