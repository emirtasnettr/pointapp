'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { legalPageTitle, type LegalPageResponse } from '@/lib/legal-pages';

type Props = {
  slug: string | null;
  open: boolean;
  onClose: () => void;
};

export function LegalDocumentModal({ slug, open, onClose }: Props) {
  const [page, setPage] = useState<LegalPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (slugStr: string) => {
    setLoading(true);
    setErr(null);
    setPage(null);
    try {
      const data = await apiGet<LegalPageResponse>(`/public/legal/${encodeURIComponent(slugStr)}`);
      setPage(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !slug) return;
    void load(slug);
  }, [open, slug, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = page?.title ?? (slug ? legalPageTitle(slug) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-doc-title"
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-200/80 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900 sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-zinc-200/80 px-5 py-4 dark:border-white/10">
          <h2 id="legal-doc-title" className="flex-1 text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/10"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Yükleniyor…</p>
          ) : err ? (
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{err}</p>
          ) : (
            <div
              className="prose prose-sm max-w-none text-zinc-700 prose-a:text-brand dark:prose-invert dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: page?.html || '<p>İçerik henüz eklenmemiş.</p>' }}
            />
          )}
        </div>
        <div className="border-t border-zinc-200/80 p-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
