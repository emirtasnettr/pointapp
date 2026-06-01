export type DeliveryServiceType = 'DOCUMENT' | 'PACKAGE';
export type VehicleTypeChoice = 'MOTORCYCLE' | 'CAR';

export const PACKAGE_MOTORCYCLE_MAX_KG = 20;

export function parsePackageKg(raw: string): number | null {
  const w = parseFloat(raw.replace(',', '.').trim());
  return Number.isFinite(w) && w > 0 ? w : null;
}

export function effectiveVehicleType(
  deliveryType: DeliveryServiceType,
  vehicleType: VehicleTypeChoice,
  weightKg: number | null,
): VehicleTypeChoice {
  if (deliveryType === 'PACKAGE' && weightKg != null && weightKg > PACKAGE_MOTORCYCLE_MAX_KG) {
    return 'CAR';
  }
  return vehicleType;
}

export function normalizeTrPhone(raw: string): string {
  const t = raw.trim();
  const d = t.replace(/\D/g, '');
  if (d.startsWith('90') && d.length >= 12) return `+${d}`;
  if (d.startsWith('0') && d.length >= 11) return `+9${d}`;
  if (d.length === 10 && d.startsWith('5')) return `+90${d}`;
  return t;
}

export function isValidTrPhone(raw: string): boolean {
  const d = normalizeTrPhone(raw).replace(/\D/g, '');
  return d.length >= 12 && d.startsWith('90');
}

export function canRequestQuote(input: {
  addressReady: boolean;
  deliveryType: DeliveryServiceType;
  parsedPackageKg: number | null;
}): boolean {
  if (!input.addressReady) return false;
  if (input.deliveryType === 'PACKAGE' && input.parsedPackageKg == null) return false;
  return true;
}

export function shipmentStepReady(input: {
  deliveryType: DeliveryServiceType;
  parsedPackageKg: number | null;
  packageContents: string;
}): boolean {
  if (input.deliveryType === 'PACKAGE') {
    if (input.parsedPackageKg == null) return false;
    if (input.packageContents.trim().length < 3) return false;
  }
  return true;
}

export function validateBeforeSubmit(input: {
  addressReady: boolean;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  deliveryType: DeliveryServiceType;
  parsedPackageKg: number | null;
  packageContents: string;
  quoteTotal: string | null;
  quoteErr: string | null;
  paymentReady: boolean;
}): string | null {
  if (!input.addressReady) return 'Alış ve teslim adreslerini eksiksiz doldurun.';
  if (!input.senderName.trim()) return 'Gönderici adı profilinizde tanımlı olmalıdır.';
  if (!isValidTrPhone(input.senderPhone)) return 'Gönderen telefonu geçerli değil (ör. +905551234567).';
  if (!input.recipientName.trim()) return 'Alıcı adı zorunludur.';
  if (!isValidTrPhone(input.recipientPhone)) return 'Alıcı telefonu geçerli değil (ör. +905551234567).';
  if (input.deliveryType === 'PACKAGE') {
    if (input.parsedPackageKg == null) return 'Paket gönderilerinde geçerli bir ağırlık (kg) girin.';
    if (input.packageContents.trim().length < 3) {
      return 'Paket içeriğini yazın (en az 3 karakter).';
    }
  }
  if (!input.quoteTotal) return input.quoteErr ?? 'Tutar hesaplanamadı. Adres ve araç bilgilerini kontrol edin.';
  if (!input.paymentReady) return 'Ödemeyi onaylayın.';
  return null;
}
