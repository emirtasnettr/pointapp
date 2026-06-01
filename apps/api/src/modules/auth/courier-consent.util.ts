import { CourierConsentType, Prisma } from '@prisma/client';

export async function recordCourierConsents(
  tx: Prisma.TransactionClient,
  courierProfileId: string,
  opts: {
    registrationTermsGranted: boolean;
    marketingOptIn: boolean;
    source: string;
  },
) {
  const at = new Date();
  await tx.courierConsent.createMany({
    data: [
      {
        courierProfileId,
        type: CourierConsentType.REGISTRATION_TERMS,
        granted: opts.registrationTermsGranted,
        recordedAt: at,
        source: opts.source,
      },
      {
        courierProfileId,
        type: CourierConsentType.MARKETING_NOTIFICATIONS,
        granted: opts.marketingOptIn,
        recordedAt: at,
        source: opts.source,
      },
    ],
  });
}

export type ConsentSnapshot = {
  granted: boolean;
  recordedAt: string;
  source: string;
} | null;

export function latestCourierConsentsByType(
  rows: Array<{
    type: CourierConsentType;
    granted: boolean;
    recordedAt: Date;
    source: string;
  }>,
): {
  registrationTerms: ConsentSnapshot;
  marketingNotifications: ConsentSnapshot;
  needsTermsAcceptance: boolean;
} {
  const reg = rows
    .filter((r) => r.type === CourierConsentType.REGISTRATION_TERMS)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  const mkt = rows
    .filter((r) => r.type === CourierConsentType.MARKETING_NOTIFICATIONS)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  const latestReg = reg[0];
  const latestMkt = mkt[0];
  const registrationTerms = latestReg
    ? {
        granted: latestReg.granted,
        recordedAt: latestReg.recordedAt.toISOString(),
        source: latestReg.source,
      }
    : null;
  const marketingNotifications = latestMkt
    ? {
        granted: latestMkt.granted,
        recordedAt: latestMkt.recordedAt.toISOString(),
        source: latestMkt.source,
      }
    : null;
  return {
    registrationTerms,
    marketingNotifications,
    needsTermsAcceptance: !registrationTerms?.granted,
  };
}

export async function recordCourierMarketingConsent(
  tx: Prisma.TransactionClient,
  courierProfileId: string,
  granted: boolean,
  source: string,
) {
  await tx.courierConsent.create({
    data: {
      courierProfileId,
      type: CourierConsentType.MARKETING_NOTIFICATIONS,
      granted,
      recordedAt: new Date(),
      source,
    },
  });
}

export function latestCourierMarketingConsent(
  rows: Array<{
    type: CourierConsentType;
    granted: boolean;
    recordedAt: Date;
    source: string;
  }>,
): ConsentSnapshot {
  const mkt = rows
    .filter((r) => r.type === CourierConsentType.MARKETING_NOTIFICATIONS)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  const latest = mkt[0];
  if (!latest) return null;
  return {
    granted: latest.granted,
    recordedAt: latest.recordedAt.toISOString(),
    source: latest.source,
  };
}
