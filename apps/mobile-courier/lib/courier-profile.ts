import { apiGetAuth } from './api';

export type ConsentSnapshot = {
  granted: boolean;
  recordedAt: string;
  source: string;
} | null;

export type CourierProfile = {
  publicId: string;
  type: string;
  vehicleType: string;
  plate: string;
  iban: string;
  accountHolderDisplay: string;
  user: {
    phone: string;
    email: string | null;
    firstName: string;
    lastName: string;
    tcKimlikNo: string;
    status: string;
    phoneVerifiedAt: string | null;
    lastLoginAt: string | null;
    memberSince: string;
  };
  wallet: { balance: string; pending: string; currency: string } | null;
  deliveredCount: number;
  consents: {
    registrationTerms: ConsentSnapshot;
    marketingNotifications: ConsentSnapshot;
  };
  createdAt: string;
  updatedAt: string;
};

export async function fetchCourierProfile(): Promise<CourierProfile> {
  return apiGetAuth<CourierProfile>('/courier/me/profile');
}

export const COURIER_TYPE_TR: Record<string, string> = {
  INDIVIDUAL: 'Bireysel',
  MERCHANT: 'Esnaf / işletme',
};

export const VEHICLE_TYPE_TR: Record<string, string> = {
  MOTORCYCLE: 'Motosiklet',
  CAR: 'Otomobil',
};

export const USER_STATUS_TR: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SUSPENDED: 'Askıda',
  PENDING_APPROVAL: 'Onay bekliyor',
  REJECTED: 'Reddedildi',
};

export function formatProfileDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export function formatConsentYesNo(snapshot: ConsentSnapshot): string {
  if (!snapshot) return 'Kayıt yok';
  return snapshot.granted ? 'Evet' : 'Hayır';
}
