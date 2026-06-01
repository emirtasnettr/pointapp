/** Türkiye özel araç plakası (il kodu + harf + rakam). */
const PLATE_RE = /^(0[1-9]|[1-7][0-9]|81)[A-Z]{1,3}\d{2,4}$/;

const TR_CHAR_MAP: Record<string, string> = {
  İ: 'I',
  I: 'I',
  ı: 'I',
  i: 'I',
  Ğ: 'G',
  ğ: 'G',
  Ü: 'U',
  ü: 'U',
  Ş: 'S',
  ş: 'S',
  Ö: 'O',
  ö: 'O',
  Ç: 'C',
  ç: 'C',
};

export function normalizeTurkishPlate(raw: string): string {
  let s = raw.trim();
  for (const [from, to] of Object.entries(TR_CHAR_MAP)) {
    s = s.split(from).join(to);
  }
  return s.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidTurkishPlate(raw: string): boolean {
  return PLATE_RE.test(normalizeTurkishPlate(raw));
}

export function formatTurkishPlateDisplay(raw: string): string {
  const n = normalizeTurkishPlate(raw);
  if (!n) return '';
  const m = /^(\d{2})([A-Z]{1,3})(\d{2,4})$/.exec(n);
  if (!m) return n;
  return `${m[1]} ${m[2]} ${m[3]}`;
}
