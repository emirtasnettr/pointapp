import { CourierOnboardingStatus, UserStatus } from '@prisma/client';

export type CourierAccountSnapshot = {
  userStatus: UserStatus;
  onboardingStatus: CourierOnboardingStatus;
  rejectionReason: string | null;
  canAccessDeliveries: boolean;
  needsDocuments: boolean;
  pendingReview: boolean;
  rejected: boolean;
};

export function buildCourierAccountState(
  user: { status: UserStatus },
  profile: { onboardingStatus: CourierOnboardingStatus; rejectionReason: string | null },
): CourierAccountSnapshot {
  const approved =
    user.status === UserStatus.ACTIVE && profile.onboardingStatus === CourierOnboardingStatus.APPROVED;
  const pendingReview = profile.onboardingStatus === CourierOnboardingStatus.PENDING_REVIEW;
  const rejected = profile.onboardingStatus === CourierOnboardingStatus.REJECTED;
  const needsDocuments =
    profile.onboardingStatus === CourierOnboardingStatus.DOCUMENTS_REQUIRED ||
    rejected;

  return {
    userStatus: user.status,
    onboardingStatus: profile.onboardingStatus,
    rejectionReason: profile.rejectionReason,
    canAccessDeliveries: approved,
    needsDocuments,
    pendingReview,
    rejected,
  };
}
