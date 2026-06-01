export const DELIVERY_CUSTOMER_INVOICE_MAX_BYTES = 40 * 1024 * 1024;

export const DELIVERY_CUSTOMER_INVOICE_MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'application/pdf': '.pdf',
};

export const DELIVERY_CUSTOMER_INVOICE_ALLOWED_MIMES = Object.keys(
  DELIVERY_CUSTOMER_INVOICE_MIME_EXT,
);

export function deliveryCustomerInvoiceFileName(
  path: string,
  mime: string | null | undefined,
): string {
  const base = path.split('/').pop() ?? 'fatura';
  if (/\.[a-z0-9]+$/i.test(base)) return base;
  const ext = mime ? (DELIVERY_CUSTOMER_INVOICE_MIME_EXT[mime.toLowerCase()] ?? '') : '';
  return `fatura${ext || '.pdf'}`;
}
