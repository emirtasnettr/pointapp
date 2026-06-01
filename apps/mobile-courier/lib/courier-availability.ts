import { apiGetAuth, apiPatchAuth } from './api';

export type CourierAvailability = {
  isOnline: boolean;
  onlineAt: string | null;
  offlineAt: string | null;
  canGoOnline: boolean;
};

export function fetchCourierAvailability() {
  return apiGetAuth<CourierAvailability>('/courier/me/availability');
}

export function setCourierAvailability(online: boolean) {
  return apiPatchAuth<CourierAvailability>('/courier/me/availability', { online });
}
