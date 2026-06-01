import * as SecureStore from 'expo-secure-store';

const KEY_TOKEN = 'courier_access_token';
const KEY_EMAIL = 'courier_email';
const KEY_PUBLIC_ID = 'courier_public_id';

export type CourierSessionPayload = {
  accessToken: string;
  email: string;
  courierPublicId: string;
};

export async function setCourierSession(p: CourierSessionPayload): Promise<void> {
  await SecureStore.setItemAsync(KEY_TOKEN, p.accessToken);
  await SecureStore.setItemAsync(KEY_EMAIL, p.email);
  await SecureStore.setItemAsync(KEY_PUBLIC_ID, p.courierPublicId);
}

export async function clearCourierSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_TOKEN);
  await SecureStore.deleteItemAsync(KEY_EMAIL);
  await SecureStore.deleteItemAsync(KEY_PUBLIC_ID);
}

export async function getCourierAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_TOKEN);
  } catch {
    return null;
  }
}

export async function getCourierEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_EMAIL);
  } catch {
    return null;
  }
}

export async function getCourierPublicId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_PUBLIC_ID);
  } catch {
    return null;
  }
}
