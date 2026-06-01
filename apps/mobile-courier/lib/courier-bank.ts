import { apiGetAuth, apiPatchAuth } from './api';

export type CourierBankInfo = {
  firstName: string;
  lastName: string;
  accountHolderDisplay: string;
  iban: string;
};

/** IBAN’ı gruplu göstermek için (yalnızca görüntü). */
export function formatIbanInput(iban: string): string {
  const c = iban.replace(/\s/g, '').toUpperCase();
  if (!c) return '';
  return c.replace(/(.{4})/g, '$1 ').trim();
}

export async function fetchCourierBank(): Promise<CourierBankInfo> {
  return apiGetAuth<CourierBankInfo>('/courier/me/bank');
}

export async function patchCourierBank(iban: string): Promise<CourierBankInfo> {
  return apiPatchAuth<CourierBankInfo>('/courier/me/bank', { iban });
}
