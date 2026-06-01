import { CustomerType } from '@prisma/client';

export function joinPersonName(first?: string | null, last?: string | null) {
  return [first, last]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Müşteri siparişlerinde gönderici adı — kurumsalda şirket ünvanı, bireyselde ad soyad. */
export function customerSenderName(customer: {
  type: CustomerType;
  companyName: string | null;
  user: { firstName: string | null; lastName: string | null };
}): string {
  if (customer.type === CustomerType.CORPORATE) {
    const co = customer.companyName?.trim();
    if (co) return co;
  }
  const person = joinPersonName(customer.user.firstName, customer.user.lastName);
  if (person) return person;
  const co = customer.companyName?.trim();
  if (co) return co;
  return '';
}

export function customerDisplayName(customer: {
  type: CustomerType;
  companyName: string | null;
  user: { firstName: string | null; lastName: string | null };
}) {
  return customerSenderName(customer);
}
