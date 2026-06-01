export type StaffSettingsResponse = {
  keys: string[];
  values: Record<string, unknown>;
  updatedAt: string | null;
};

export const STAFF_SETTINGS_QUERY_KEY = ['staff', 'settings'] as const;

export function numSetting(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}

export function strSetting(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fallback;
}
