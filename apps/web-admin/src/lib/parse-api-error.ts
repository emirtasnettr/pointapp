export async function parseApiError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(j.message)) return j.message.join(' ');
    if (typeof j.message === 'string') return j.message;
  } catch {
    /* ham metin */
  }
  return raw || 'İşlem başarısız';
}
