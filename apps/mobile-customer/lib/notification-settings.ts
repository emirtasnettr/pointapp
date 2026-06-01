import type { Router } from 'expo-router';
import { apiGetAuth, apiPatchAuth } from './api';
import { getNotificationPromptDone, setNotificationPromptDone } from './push-notifications';

export type NotificationSettings = {
  enabled: boolean;
  updatedAt: string | null;
  source: string | null;
};

export function fetchNotificationSettings() {
  return apiGetAuth<NotificationSettings>('/customer/me/notification-settings');
}

export function updateNotificationSettings(body: {
  enabled: boolean;
  deviceId?: string;
  platform?: string;
  pushToken?: string | null;
}) {
  return apiPatchAuth<NotificationSettings>('/customer/me/notification-settings', body);
}

export async function routeCustomerAfterAuth(router: Pick<Router, 'replace'>): Promise<void> {
  const prompted = await getNotificationPromptDone();
  if (!prompted) {
    router.replace('/onboarding/notifications');
    return;
  }
  router.replace('/(tabs)');
}

export async function completeNotificationOnboarding(router: Pick<Router, 'replace'>): Promise<void> {
  await setNotificationPromptDone();
  router.replace('/(tabs)');
}
