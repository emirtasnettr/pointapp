import { publicApiGet } from './public-api';

export type PublicMarketingService = {
  slug: string;
  title: string;
  summary: string;
  iconUrl: string | null;
  updatedAt: string;
};

export type PublicMarketingServiceDetail = PublicMarketingService & {
  heroTitle: string;
  heroTitleAccent: string | null;
  heroDescription: string;
  contentHtml: string;
};

export type StaffMarketingService = PublicMarketingServiceDetail & {
  id: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
};

export const STAFF_MARKETING_SERVICES_KEY = ['staff', 'marketing-services'] as const;

export const MARKETING_SERVICE_ICON_PX = 200;

export function marketingServicePath(slug: string) {
  return `/hizmetler/${encodeURIComponent(slug)}`;
}

export async function fetchPublicMarketingServices() {
  return publicApiGet<{ items: PublicMarketingService[] }>('/public/marketing-services');
}

export async function fetchPublicMarketingService(slug: string) {
  return publicApiGet<PublicMarketingServiceDetail>(
    `/public/marketing-services/${encodeURIComponent(slug)}`,
  );
}
