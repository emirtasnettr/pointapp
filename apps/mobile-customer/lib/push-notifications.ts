import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'point_customer_device_id';
const PROMPT_DONE_KEY = 'point_customer_notification_prompt_done';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getEasProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  let generated: string | null = null;
  if (Platform.OS === 'ios') {
    generated = await Application.getIosIdForVendorAsync().catch(() => null);
  } else if (Platform.OS === 'android') {
    generated = Application.getAndroidId?.() ?? null;
  }
  const id = generated ?? `expo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

export function getNotificationPromptDone() {
  return SecureStore.getItemAsync(PROMPT_DONE_KEY).then((v) => v === '1');
}

export function setNotificationPromptDone() {
  return SecureStore.setItemAsync(PROMPT_DONE_KEY, '1');
}

export async function getOsNotificationPermission(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export type PushPermissionResult = {
  granted: boolean;
  pushToken: string | null;
  error?: string;
};

export async function requestPushPermissionAndToken(): Promise<PushPermissionResult> {
  if (!Device.isDevice) {
    return {
      granted: false,
      pushToken: null,
      error: 'Push bildirimleri yalnızca fiziksel cihazda çalışır.',
    };
  }

  let perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') {
    perm = await Notifications.requestPermissionsAsync();
  }
  if (perm.status !== 'granted') {
    return { granted: false, pushToken: null };
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    return {
      granted: true,
      pushToken: null,
      error:
        'EAS projectId yapılandırması eksik. app.json içinde extra.eas.projectId tanımlanmalı veya EXPO_PUBLIC_EAS_PROJECT_ID kullanılmalı.',
    };
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return { granted: true, pushToken: token.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Push token alınamadı';
    return { granted: true, pushToken: null, error: message };
  }
}

export function platformLabel(): string {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : Platform.OS;
}
