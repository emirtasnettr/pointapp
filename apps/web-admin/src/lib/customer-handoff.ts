import { apiBase } from './api';
import { customerPanelHandoffUrl } from './marketing-links';

export async function redirectToCustomerPanelWithHandoff(
  accessToken: string,
  next?: string | null,
): Promise<void> {
  const res = await fetch(`${apiBase()}/auth/customer/handoff`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('Panel oturumu başlatılamadı');
  }
  const data = (await res.json()) as { code: string };
  window.location.assign(customerPanelHandoffUrl(data.code, next));
}
