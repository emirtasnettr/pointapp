export const PAYOUT_INVOICE_MAX_BYTES = 40 * 1024 * 1024;

export const PAYOUT_INVOICE_MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'application/pdf': '.pdf',
};

export const PAYOUT_INVOICE_ALLOWED_MIMES = Object.keys(PAYOUT_INVOICE_MIME_EXT);
