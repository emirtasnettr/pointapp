import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiBase } from './api';
import { getCustomerAccessToken } from './session';

function extFromMime(mime: string | null): string {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('pdf')) return '.pdf';
  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  return '.bin';
}

/** Müşteri faturasını indirip paylaşım / önizleme sheet'i ile açar. */
export async function openCustomerDeliveryInvoice(invoiceId: string): Promise<void> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error('Oturum yok. Lütfen giriş yapın.');
  }
  const url = `${apiBase()}/customer/deliveries/customer-invoices/${encodeURIComponent(invoiceId)}/file`;
  const dest = `${FileSystem.cacheDirectory}invoice-${invoiceId}${extFromMime(null)}`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error('Fatura indirilemedi');
  }
  const mime =
    (result.headers && (result.headers['Content-Type'] ?? result.headers['content-type'])) ||
    'application/pdf';
  const finalPath = dest.replace(/\.bin$/, extFromMime(mime));
  if (finalPath !== dest) {
    await FileSystem.moveAsync({ from: dest, to: finalPath });
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalPath, { mimeType: mime, dialogTitle: 'Fatura' });
    return;
  }
  throw new Error('Bu cihazda fatura görüntüleme desteklenmiyor.');
}
