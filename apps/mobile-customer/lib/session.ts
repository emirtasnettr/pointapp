import * as SecureStore from 'expo-secure-store';

const KEY_TOKEN = 'customer_access_token';
const KEY_EMAIL = 'customer_email';
const KEY_PUBLIC_ID = 'customer_public_id';

export type CustomerSessionPayload = {
  accessToken: string;
  email: string;
  customerPublicId: string;
};

export async function setCustomerSession(p: CustomerSessionPayload): Promise<void> {
  await SecureStore.setItemAsync(KEY_TOKEN, p.accessToken);
  await SecureStore.setItemAsync(KEY_EMAIL, p.email);
  await SecureStore.setItemAsync(KEY_PUBLIC_ID, p.customerPublicId);
}

export async function clearCustomerSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_TOKEN);
  await SecureStore.deleteItemAsync(KEY_EMAIL);
  await SecureStore.deleteItemAsync(KEY_PUBLIC_ID);
}

export async function getCustomerAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_TOKEN);
  } catch {
    return null;
  }
}

export async function getCustomerEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_EMAIL);
  } catch {
    return null;
  }
}

export async function getCustomerPublicId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_PUBLIC_ID);
  } catch {
    return null;
  }
}
