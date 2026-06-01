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

export type TrackOtpRequestResponse = {
  ok: true;
  expiresAt: string;
  phone: string;
  simulatedOtp?: string;
  simulationNotice?: string;
};

export function requestTrackDeliveryOtp(phone: string): Promise<TrackOtpRequestResponse> {
  return publicApiPost<TrackOtpRequestResponse>('/public/deliveries/track/request-otp', { phone });
}

export function verifyTrackDeliveryOtp(phone: string, smsCode: string): Promise<TrackByPhoneResponse> {
  return publicApiPost<TrackByPhoneResponse>('/public/deliveries/track/verify', { phone, smsCode });
}
