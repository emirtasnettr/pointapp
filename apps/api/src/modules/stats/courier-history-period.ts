import { BadRequestException } from '@nestjs/common';

/** Mobil geçmiş filtresi — bugün dahil geriye dönük. */
export const COURIER_HISTORY_PERIODS = ['7d', '15d', '30d', '6m', '12m', '24m'] as const;
export type CourierHistoryPeriod = (typeof COURIER_HISTORY_PERIODS)[number];

export const DEFAULT_COURIER_HISTORY_PERIOD: CourierHistoryPeriod = '7d';

export function parseCourierHistoryPeriod(raw?: string): CourierHistoryPeriod {
  const v = (raw?.trim() || DEFAULT_COURIER_HISTORY_PERIOD) as CourierHistoryPeriod;
  if (!COURIER_HISTORY_PERIODS.includes(v)) {
    throw new BadRequestException(
      `Geçersiz period. İzin verilenler: ${COURIER_HISTORY_PERIODS.join(', ')}`,
    );
  }
  return v;
}

/** Seçilen dönemin başlangıcı (yerel gün 00:00, bugün dahil geriye). */
export function courierHistorySince(period: CourierHistoryPeriod, now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case '15d':
      start.setDate(start.getDate() - 14);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '12m':
      start.setMonth(start.getMonth() - 12);
      break;
    case '24m':
      start.setMonth(start.getMonth() - 24);
      break;
    default:
      start.setDate(start.getDate() - 6);
  }

  return start;
}
