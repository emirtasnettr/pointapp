import { apiGetAuth } from './api';

export type CourierMeDelivery = {
  id: string;
  orderNumber: number;
  status: string;
  type?: string;
  weightKg?: string | null;
  courierEarning?: string;
  pickupAddress?: unknown;
  dropoffAddress?: unknown;
  customer: { publicId: string; displayName?: string };
  description: string | null;
  courier?: { publicId: string; displayName?: string } | null;
};

export type CourierMeHistoryRow = {
  id: string;
  orderNumber: number;
  courierEarning: string;
  updatedAt: string;
  description: string | null;
};

export type CourierMe = {
  requestedPublicId: string;
  courierPublicId: string;
  poolCount: number;
  wallet: { balance: string; pending: string; currency: string } | null;
  myActive: CourierMeDelivery[];
  delivered: { count: number; totalCourierEarning: string };
  recentDelivered: CourierMeHistoryRow[];
  ledger: Array<{ id: string; amount: string; type: string; createdAt: string }>;
};

export function fetchCourierMe() {
  return apiGetAuth<CourierMe>('/stats/courier/me');
}

export type CourierHistoryResponse = {
  period: string;
  since: string;
  total: number;
  items: CourierMeHistoryRow[];
};

export function fetchCourierHistory(period: string) {
  const q = encodeURIComponent(period);
  return apiGetAuth<CourierHistoryResponse>(`/stats/courier/history?period=${q}`);
}
