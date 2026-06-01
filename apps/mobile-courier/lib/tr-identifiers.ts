/** T.C. ve VKN doğrulama (API ile aynı kurallar). */
export function isValidTCKimlikNo(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  const d = digits.split('').map((c) => parseInt(c, 10));
  if (d.some((x) => x < 0 || x > 9)) return false;
  if (d[0] === 0) return false;
  if (d.every((x) => x === d[0])) return false;
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  let d10 = (odd * 7 - even) % 10;
  if (d10 < 0) d10 += 10;
  if (d[9] !== d10) return false;
  const sum10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return sum10 % 10 === d[10];
}

export function isValidTurkishVKN(raw: string): boolean {
  const v = raw.replace(/\D/g, '');
  if (!/^\d{10}$/.test(v)) return false;
  const d = v.split('').map((c) => parseInt(c, 10));
  if (d.every((x) => x === d[0])) return false;
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let p = d[i] * weights[i];
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    sum += p;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === d[9];
}

const MIN_COURIER_AGE = 18;

/** Doğum günü dahil en az `years` yaşında mı (kayıt günü itibarıyla). */
export function isAtLeastYearsOld(birthDate: Date, years: number = MIN_COURIER_AGE): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = new Date(birthDate);
  birth.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return birth <= cutoff;
}

export function maxBirthDateForMinAge(years: number = MIN_COURIER_AGE): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
