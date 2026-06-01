/** API ile aynı: Europe/Istanbul YYYY-MM-DD (+3, yaz saati yok). */
const IST_OFFSET_MS = 3 * 60 * 60 * 1000;

export function formatYmdIstanbul(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function istanbulYmdToUtcBounds(ymd: string): { gte: Date; lte: Date } {
  const [ys, ms, ds] = ymd.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new TypeError('ymd');
  }
  const gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
  const lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { gte, lte };
}

export function addCalendarDaysIstanbul(ymd: string, deltaDays: number): string {
  const { gte } = istanbulYmdToUtcBounds(ymd);
  const mid = new Date(gte.getTime() + 12 * 60 * 60 * 1000 + deltaDays * 24 * 60 * 60 * 1000);
  return formatYmdIstanbul(mid);
}
