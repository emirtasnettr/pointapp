import { apiGet } from './api';

export type MarketingCampaignPhase = 'active' | 'upcoming' | 'expired';

export type PublicMarketingCampaign = {
  slug: string;
  title: string;
  summary: string;
  partnerLabel: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
  phase: MarketingCampaignPhase;
};

export type PublicMarketingCampaignDetail = PublicMarketingCampaign & {
  contentHtml: string;
};

export const PHASE_LABEL: Record<MarketingCampaignPhase, string> = {
  active: 'Aktif',
  upcoming: 'Yakında',
  expired: 'Sona erdi',
};

export function formatCampaignDateRange(startsAt: string, endsAt: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const s = new Date(startsAt).toLocaleDateString('tr-TR', opts);
  const e = new Date(endsAt).toLocaleDateString('tr-TR', opts);
  return `${s} – ${e}`;
}

export type PublicMarketingCampaignsListResponse = {
  items: PublicMarketingCampaign[];
  total: number;
  skip: number;
  take: number;
};

export async function fetchPublicMarketingCampaigns(params?: { skip?: number; take?: number }) {
  const qs = new URLSearchParams();
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.take != null) qs.set('take', String(params.take));
  const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
  return apiGet<PublicMarketingCampaignsListResponse>(`/public/marketing-campaigns${suffix}`);
}

export async function fetchPublicMarketingCampaign(slug: string) {
  return apiGet<PublicMarketingCampaignDetail>(
    `/public/marketing-campaigns/${encodeURIComponent(slug)}`,
  );
}
