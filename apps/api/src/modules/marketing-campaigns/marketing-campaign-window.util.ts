export type MarketingCampaignPhase = 'active' | 'upcoming' | 'expired';

export function marketingCampaignPhase(
  startsAt: Date,
  endsAt: Date,
  now: Date = new Date(),
): MarketingCampaignPhase {
  if (now > endsAt) return 'expired';
  if (now < startsAt) return 'upcoming';
  return 'active';
}
