import { publicApiGet } from './public-api';

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

export type StaffMarketingCampaign = PublicMarketingCampaign & {
  id: string;
  contentHtml: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
};

export const STAFF_MARKETING_CAMPAIGNS_KEY = ['staff', 'marketing-campaigns'] as const;

/** Tanıtım kampanya kartı kapak alanı (16:9, object-cover) */
export const MARKETING_CAMPAIGN_COVER_RECOMMENDED_PX = { width: 1280, height: 720 } as const;

export function marketingCampaignPath(slug: string) {
  return `/kampanyalar/${encodeURIComponent(slug)}`;
}

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

export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(local: string): string {
  return new Date(local).toISOString();
}

export async function fetchPublicMarketingCampaigns() {
  return publicApiGet<{ items: PublicMarketingCampaign[]; total: number }>(
    '/public/marketing-campaigns?take=100',
  );
}

export async function fetchPublicMarketingCampaign(slug: string) {
  return publicApiGet<PublicMarketingCampaignDetail>(
    `/public/marketing-campaigns/${encodeURIComponent(slug)}`,
  );
}
