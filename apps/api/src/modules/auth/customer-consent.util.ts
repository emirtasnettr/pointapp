import { CustomerConsentType, Prisma } from '@prisma/client';

export async function recordCustomerConsents(
  tx: Prisma.TransactionClient,
  customerProfileId: string,
  opts: {
    registrationTermsGranted: boolean;
    marketingOptIn: boolean;
    source: string;
  },
) {
  const at = new Date();
  await tx.customerConsent.createMany({
    data: [
      {
        customerProfileId,
        type: CustomerConsentType.REGISTRATION_TERMS,
        granted: opts.registrationTermsGranted,
        recordedAt: at,
        source: opts.source,
      },
      {
        customerProfileId,
        type: CustomerConsentType.MARKETING_ELECTRONIC,
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

export function latestConsentsByType(
  rows: Array<{
    type: CustomerConsentType;
    granted: boolean;
    recordedAt: Date;
    source: string;
  }>,
): {
  registrationTerms: ConsentSnapshot;
  marketingElectronic: ConsentSnapshot;
} {
  const reg = rows.filter((r) => r.type === CustomerConsentType.REGISTRATION_TERMS);
  const mkt = rows.filter((r) => r.type === CustomerConsentType.MARKETING_ELECTRONIC);
  const latestReg = reg.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
  const latestMkt = mkt.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
  return {
    registrationTerms: latestReg
      ? {
          granted: latestReg.granted,
          recordedAt: latestReg.recordedAt.toISOString(),
          source: latestReg.source,
        }
      : null,
    marketingElectronic: latestMkt
      ? {
          granted: latestMkt.granted,
          recordedAt: latestMkt.recordedAt.toISOString(),
          source: latestMkt.source,
        }
      : null,
  };
}

export async function recordCustomerMarketingConsent(
  tx: Prisma.TransactionClient,
  customerProfileId: string,
  granted: boolean,
  source: string,
) {
  await tx.customerConsent.create({
    data: {
      customerProfileId,
      type: CustomerConsentType.MARKETING_ELECTRONIC,
      granted,
      recordedAt: new Date(),
      source,
    },
  });
}

export function latestMarketingConsent(
  rows: Array<{
    type: CustomerConsentType;
    granted: boolean;
    recordedAt: Date;
    source: string;
  }>,
): ConsentSnapshot {
  const mkt = rows
    .filter((r) => r.type === CustomerConsentType.MARKETING_ELECTRONIC)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  const latest = mkt[0];
  if (!latest) return null;
  return {
    granted: latest.granted,
    recordedAt: latest.recordedAt.toISOString(),
    source: latest.source,
  };
}
