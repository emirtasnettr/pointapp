import {
  CourierDocumentReviewStatus,
  CourierOnboardingStatus,
  type CourierDocumentRequirement,
  type CourierDocumentSubmission,
  type CourierType,
} from '@prisma/client';

export type RequirementWithSubmission = CourierDocumentRequirement & {
  submission: CourierDocumentSubmission | null;
};

export function activeRequiredRequirements(
  requirements: CourierDocumentRequirement[],
): CourierDocumentRequirement[] {
  return requirements.filter((r) => r.active && r.required);
}

export function summarizeDocumentReview(
  requirements: CourierDocumentRequirement[],
  submissions: CourierDocumentSubmission[],
): {
  totalRequired: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  allRequiredApproved: boolean;
  hasRejected: boolean;
} {
  const required = activeRequiredRequirements(requirements);
  const subByReq = new Map(submissions.map((s) => [s.requirementId, s]));

  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const req of required) {
    const sub = subByReq.get(req.id);
    if (!sub) {
      pendingCount += 1;
      continue;
    }
    if (sub.reviewStatus === CourierDocumentReviewStatus.APPROVED) approvedCount += 1;
    else if (sub.reviewStatus === CourierDocumentReviewStatus.REJECTED) rejectedCount += 1;
    else pendingCount += 1;
  }

  return {
    totalRequired: required.length,
    approvedCount,
    pendingCount,
    rejectedCount,
    allRequiredApproved: required.length > 0 && approvedCount === required.length,
    hasRejected: rejectedCount > 0,
  };
}

export function submissionHasContent(
  req: CourierDocumentRequirement,
  sub: CourierDocumentSubmission | undefined,
): boolean {
  if (!sub) return false;
  if (req.kind === 'TEXT') return Boolean(sub.textValue?.trim());
  return Boolean(sub.fileUrl);
}

export function canCourierEditSubmission(
  onboardingStatus: CourierOnboardingStatus,
  submission: CourierDocumentSubmission | undefined,
): boolean {
  if (onboardingStatus === CourierOnboardingStatus.APPROVED) return false;
  if (onboardingStatus === CourierOnboardingStatus.PENDING_REVIEW) return false;
  if (!submission) return true;
  return submission.reviewStatus !== CourierDocumentReviewStatus.APPROVED;
}
