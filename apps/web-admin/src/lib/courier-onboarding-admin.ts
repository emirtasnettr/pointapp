export type CourierTypeApi = 'INDIVIDUAL' | 'MERCHANT';
export type CourierDocKindApi = 'FILE' | 'TEXT';
export type CourierDocReviewStatusApi = 'PENDING' | 'APPROVED' | 'REJECTED';

export const DOC_REVIEW_STATUS_TR: Record<CourierDocReviewStatusApi, string> = {
  PENDING: 'İnceleme bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};
export type CourierOnboardingStatusApi =
  | 'DOCUMENTS_REQUIRED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type MerchantCompanyTypeApi = 'SOLE_PROPRIETORSHIP' | 'JOINT_STOCK' | 'LIMITED';

export const COURIER_TYPE_TR: Record<CourierTypeApi, string> = {
  INDIVIDUAL: 'Bireysel',
  MERCHANT: 'Esnaf',
};

export const VEHICLE_TYPE_TR: Record<string, string> = {
  MOTORCYCLE: 'Motosiklet',
  CAR: 'Otomobil',
};

export const MERCHANT_COMPANY_TYPE_TR: Record<MerchantCompanyTypeApi, string> = {
  SOLE_PROPRIETORSHIP: 'Şahıs şirketi',
  JOINT_STOCK: 'Anonim şirket',
  LIMITED: 'Limited şirket',
};

export const USER_STATUS_TR: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SUSPENDED: 'Askıda',
  PENDING_APPROVAL: 'Onay bekliyor',
  REJECTED: 'Reddedildi',
};

export const ONBOARDING_STATUS_TR: Record<CourierOnboardingStatusApi, string> = {
  DOCUMENTS_REQUIRED: 'Evrak bekleniyor',
  PENDING_REVIEW: 'İncelemede',
  APPROVED: 'Onaylı',
  REJECTED: 'Reddedildi',
};

export type ConsentSnapshot = {
  granted: boolean;
  recordedAt: string;
  source: string;
} | null;

export type DocumentRequirement = {
  id: string;
  courierType: CourierTypeApi;
  kind: CourierDocKindApi;
  label: string;
  hint: string | null;
  required: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationsListResponse = {
  items: Array<{
    publicId: string;
    type: CourierTypeApi;
    vehicleType: string;
    plate: string | null;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string;
    tcKimlikNo: string | null;
    userStatus: string;
    onboardingStatus: CourierOnboardingStatusApi;
    submittedForReviewAt: string | null;
    createdAt: string;
  }>;
  total: number;
  skip: number;
  take: number;
};

export type ApplicationDetail = {
  publicId: string;
  displayName: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string;
    status: string;
    tcKimlikNo: string | null;
    birthDate: string | null;
    phoneVerifiedAt: string | null;
    createdAt: string;
  };
  profile: {
    type: CourierTypeApi;
    vehicleType: string;
    plate: string | null;
    merchantCompanyType: MerchantCompanyTypeApi | null;
    taxNumber: string | null;
    iban: string | null;
    createdAt: string;
    updatedAt: string;
  };
  consents: {
    registrationTerms: ConsentSnapshot;
    marketingNotifications: ConsentSnapshot;
  };
  account: {
    userStatus: string;
    onboardingStatus: CourierOnboardingStatusApi;
    rejectionReason: string | null;
    canAccessDeliveries: boolean;
    needsDocuments: boolean;
    pendingReview: boolean;
    rejected: boolean;
  };
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  reviewedBy: { email: string | null; name: string } | null;
  documentsReview: {
    totalRequired: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    allRequiredApproved: boolean;
    hasRejected: boolean;
  };
  requirements: Array<{
    id: string;
    submissionId: string | null;
    kind: CourierDocKindApi;
    label: string;
    hint: string | null;
    required: boolean;
    active: boolean;
    reviewStatus: CourierDocReviewStatusApi;
    rejectionReason: string | null;
    reviewedAt: string | null;
    hasContent: boolean;
    textValue: string | null;
    fileUrl: string | null;
    uploadedAt: string | null;
  }>;
};

export function formatAdminDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAdminDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}
