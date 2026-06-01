export const HISTORY_PERIODS = ['7d', '15d', '30d', '6m', '12m', '24m'] as const;
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];

export const DEFAULT_HISTORY_PERIOD: HistoryPeriod = '7d';

export const HISTORY_PERIOD_LABELS: Record<HistoryPeriod, string> = {
  '7d': 'Son 7 Gün',
  '15d': 'Son 15 Gün',
  '30d': 'Son 30 Gün',
  '6m': 'Son 6 Ay',
  '12m': 'Son 12 Ay',
  '24m': 'Son 24 Ay',
};
