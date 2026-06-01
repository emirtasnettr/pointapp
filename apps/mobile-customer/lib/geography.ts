import { apiGet } from './api';

export type GeoRegion = { id: string; code: string; name: string; sortOrder: number };
export type GeoDistrict = { id: string; name: string; regionId: string };
export type GeoNeighborhood = { id: string; name: string; districtId: string; extraFee: string };

export async function fetchRegions(): Promise<GeoRegion[]> {
  return apiGet<GeoRegion[]>('/geography/regions');
}

export async function fetchDistricts(regionId?: string): Promise<GeoDistrict[]> {
  const q = regionId ? `?regionId=${encodeURIComponent(regionId)}` : '';
  return apiGet<GeoDistrict[]>(`/geography/districts${q}`);
}

export async function fetchNeighborhoods(districtId: string): Promise<GeoNeighborhood[]> {
  return apiGet<GeoNeighborhood[]>(`/geography/neighborhoods?districtId=${encodeURIComponent(districtId)}`);
}
