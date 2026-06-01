export function formatPackageWeightKg(weightKg: string | null | undefined): string | null {
  if (weightKg == null || weightKg === '') return null;
  const n = Number.parseFloat(String(weightKg).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kg`;
}

export function formatTry(amount: string): string {
  const n = amount.replace(',', '.').trim();
  const x = parseFloat(n);
  if (!Number.isFinite(x)) return `${amount} ₺`;
  return `${x.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}
