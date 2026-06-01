import type { Router } from 'expo-router';
import {
  apiGetAuth,
  apiPatchAuth,
  apiPostAuth,
  apiPostAuthMultipart,
} from './api';

export type CourierAccountState = {
  userStatus: string;
  onboardingStatus: string;
  rejectionReason: string | null;
  canAccessDeliveries: boolean;
  needsDocuments: boolean;
  pendingReview: boolean;
  rejected: boolean;
};

export type OnboardingRequirement = {
  id: string;
  kind: 'FILE' | 'TEXT';
  label: string;
  hint: string | null;
  required: boolean;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  canEdit: boolean;
  textValue: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};

export type DocumentsReviewSummary = {
  totalRequired: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  allRequiredApproved: boolean;
  hasRejected: boolean;
};

export type CourierOnboardingState = {
  account: CourierAccountState;
  courierType: string;
  documentsReview: DocumentsReviewSummary;
  requirements: OnboardingRequirement[];
};

export function fetchCourierOnboarding() {
  return apiGetAuth<CourierOnboardingState>('/courier/me/onboarding');
}

export function saveOnboardingText(requirementId: string, textValue: string) {
  return apiPatchAuth(`/courier/me/onboarding/requirements/${requirementId}/text`, { textValue });
}

export function uploadOnboardingFile(requirementId: string, form: FormData) {
  return apiPostAuthMultipart(`/courier/me/onboarding/requirements/${requirementId}/file`, form);
}

export function submitOnboardingForReview() {
  return apiPostAuth('/courier/me/onboarding/submit');
}

export async function routeCourierAfterAuth(router: Pick<Router, 'replace'>): Promise<void> {
  const { fetchCourierConsentsStatus } = await import('./courier-consents');
  const consents = await fetchCourierConsentsStatus();
  if (consents.needsTermsAcceptance) {
    router.replace('/onboarding/consents');
    return;
  }

  const onboarding = await fetchCourierOnboarding();
  if (onboarding.account.pendingReview) {
    router.replace('/onboarding/pending-review');
    return;
  }
  if (onboarding.account.needsDocuments) {
    router.replace('/onboarding/documents');
    return;
  }
  if (onboarding.account.canAccessDeliveries) {
    router.replace('/(tabs)/pool');
    return;
  }
  router.replace('/onboarding/documents');
}
