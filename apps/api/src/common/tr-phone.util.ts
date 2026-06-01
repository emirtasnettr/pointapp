import { BadRequestException } from '@nestjs/common';

/** Türkiye cep telefonu: +905XXXXXXXXX */
export function normalizeTrMobile(raw: string): string {
  const s = raw.replace(/\s|-/g, '').trim();
  if (s.startsWith('+90')) {
    const rest = s.slice(3);
    if (/^5\d{9}$/.test(rest)) return `+90${rest}`;
    throw new BadRequestException('Geçersiz telefon numarası');
  }
  if (s.startsWith('90') && /^905\d{9}$/.test(s)) return `+${s}`;
  if (s.startsWith('0') && /^05\d{9}$/.test(s)) return `+9${s.slice(1)}`;
  if (/^5\d{9}$/.test(s)) return `+90${s}`;
  throw new BadRequestException('Geçersiz telefon numarası');
}

/** Veritabanındaki farklı yazımlarla eşleşme için telefon varyantları. */
export function trPhoneLookupVariants(raw: string): string[] {
  const canonical = normalizeTrMobile(raw);
  const digits = canonical.replace(/\D/g, '');
  const national = digits.startsWith('90') ? digits.slice(2) : digits;
  return [...new Set([canonical, `+${digits}`, `0${national}`, national, digits])];
}
