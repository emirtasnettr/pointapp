import { apiGetAuth, apiPostAuthMultipart } from './api';

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export type CourierPayoutItem = {
  id: string;
  amount: string;
  status: PayoutStatus;
  ibanMasked: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasInvoice: boolean;
  invoiceMime: string | null;
};

export type PayoutInvoicePick = {
  uri: string;
  name: string;
  mimeType: string;
};

export async function fetchCourierPayoutRequests(): Promise<{ items: CourierPayoutItem[] }> {
  return apiGetAuth('/courier/me/payout-requests');
}

export async function createCourierPayoutRequest(body: {
  amount: string;
  note?: string;
  invoice: PayoutInvoicePick;
}): Promise<{ items: CourierPayoutItem[] }> {
  const form = new FormData();
  form.append('amount', body.amount);
  if (body.note?.trim()) {
    form.append('note', body.note.trim());
  }
  form.append('invoice', {
    uri: body.invoice.uri,
    name: body.invoice.name,
    type: body.invoice.mimeType,
  } as unknown as Blob);
  return apiPostAuthMultipart('/courier/me/payout-requests', form);
}
