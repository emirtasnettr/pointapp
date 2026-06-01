/** İstemci tarafı `next` query için açık yönlendirmeyi engeller. */
export function safeInternalPath(next: string | null, fallback = '/panel'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  if (next.includes('://') || next.includes('\\')) return fallback;
  return next;
}
