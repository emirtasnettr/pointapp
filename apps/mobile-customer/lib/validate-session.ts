import { apiGetAuth } from './api';
import { getCustomerAccessToken } from './session';

/** Kayıtlı token geçerliyse true; 401’de oturum temizlenir. */
export async function validateCustomerSession(): Promise<boolean> {
  const token = await getCustomerAccessToken();
  if (!token) return false;
  try {
    await apiGetAuth('/customer/me');
    return true;
  } catch {
    return false;
  }
}
