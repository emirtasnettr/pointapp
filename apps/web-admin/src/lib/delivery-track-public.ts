import { publicApiPost } from './public-api';

export type PublicTrackedDelivery = {
  orderNumber: number;
  status: string;
  type: 'DOCUMENT' | 'PACKAGE';
  createdAt: string;
  senderName: string;
  recipientName: string;
  pickupSummary: string;
  dropoffSummary: string;
};

export type TrackByPhoneResponse = {
  items: PublicTrackedDelivery[];
};

export function trackDeliveriesByPhone(phone: string): Promise<TrackByPhoneResponse> {
  return publicApiPost<TrackByPhoneResponse>('/public/deliveries/track-by-phone', { phone });
}
