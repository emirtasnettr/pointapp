import { apiGetAuth, apiPatchAuth } from './api';

export type NotificationSettings = {
  enabled: boolean;
  updatedAt: string | null;
  source: string | null;
};

export function fetchNotificationSettings() {
  return apiGetAuth<NotificationSettings>('/courier/me/notification-settings');
}

export function updateNotificationSettings(body: {
  enabled: boolean;
  deviceId?: string;
  platform?: string;
  pushToken?: string | null;
}) {
  return apiPatchAuth<NotificationSettings>('/courier/me/notification-settings', body);
}
